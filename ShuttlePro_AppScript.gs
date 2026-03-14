// ============================================================
// ShuttlePro — Google Apps Script Backend
// Deploy as: Extensions > Apps Script > Deploy > Web App
//   - Execute as: Me
//   - Who has access: Anyone (or Anyone with Google account)
// Copy the deployed Web App URL into the HTML file's
//   APPS_SCRIPT_URL constant.
// ============================================================

const SPREADSHEET_ID = ''; // ← Paste your Google Spreadsheet ID here
                            //   (from the sheet URL: /d/SPREADSHEET_ID/edit)

// ------------------------------------------------------------
// ENTRY POINT — all requests come here
// ------------------------------------------------------------
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;
    let result;

    switch (action) {
      case 'saveTournamentSetup':  result = saveTournamentSetup(payload.data);  break;
      case 'saveMatchScore':       result = saveMatchScore(payload.data);       break;
      case 'saveFinalStandings':   result = saveFinalStandings(payload.data);   break;
      case 'saveCrossoverResult':  result = saveCrossoverResult(payload.data);  break;
      case 'endTournament':        result = endTournament(payload.data);        break;
      case 'getHistory':           result = getHistory();                       break;
      default:
        result = { ok: false, error: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getHistory') return jsonResponse(getHistory());
  return jsonResponse({ ok: true, message: 'ShuttlePro Apps Script is running.' });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getSS() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function headerStyle(sheet, row, numCols, bg, fg) {
  const range = sheet.getRange(row, 1, 1, numCols);
  range.setBackground(bg || '#1a1f2e');
  range.setFontColor(fg || '#f0c040');
  range.setFontWeight('bold');
  range.setFontSize(11);
}

function sectionHeader(sheet, row, numCols, label, bg) {
  sheet.getRange(row, 1, 1, numCols).merge()
    .setValue(label)
    .setBackground(bg || '#2d3347')
    .setFontColor('#e8eaf0')
    .setFontWeight('bold')
    .setFontSize(10);
}

function autoResizeCols(sheet, num) {
  for (let i = 1; i <= num; i++) sheet.autoResizeColumn(i);
}

// ------------------------------------------------------------
// 1. SAVE TOURNAMENT SETUP (players + brackets)
//    Called when brackets are generated.
//    Creates a new sheet tab named: "TournamentName_Setup"
// ------------------------------------------------------------
function saveTournamentSetup(data) {
  // data: { tournamentId, tournamentName, category, createdAt, levels }
  // levels: [{ name, brackets: [{ label, pairs: [[p1,p2],...] }] }]
  const ss = getSS();
  const sheetName = sanitize(data.tournamentName) + '_Setup';
  const sheet = getOrCreateSheet(ss, sheetName);
  sheet.clearContents();
  sheet.clearFormats();

  let row = 1;

  // Title block
  sheet.getRange(row, 1, 1, 5).merge()
    .setValue('SHUTTLEPRO — ' + data.tournamentName.toUpperCase())
    .setBackground('#1a1f2e').setFontColor('#f0c040')
    .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  row++;

  sheet.getRange(row, 1, 1, 5).merge()
    .setValue('Category: ' + data.category + '   |   Created: ' + data.createdAt)
    .setBackground('#242938').setFontColor('#9ba3c2')
    .setFontSize(10).setHorizontalAlignment('center');
  row += 2;

  data.levels.forEach(level => {
    sectionHeader(sheet, row, 5, '▶  LEVEL: ' + level.name.toUpperCase(), '#242938');
    row++;

    level.brackets.forEach(bracket => {
      sectionHeader(sheet, row, 5, bracket.label, '#2d3347');
      row++;

      // Header
      const hdrs = data.category === 'Doubles'
        ? ['#', 'Player 1', 'Player 2', 'Bracket', 'Level']
        : ['#', 'Player', '', 'Bracket', 'Level'];
      sheet.getRange(row, 1, 1, 5).setValues([hdrs]);
      headerStyle(sheet, row, 5, '#363d56', '#f0c040');
      row++;

      bracket.pairs.forEach((pair, idx) => {
        sheet.getRange(row, 1, 1, 5).setValues([[
          idx + 1,
          pair[0] || '',
          pair[1] || '',
          bracket.label,
          level.name
        ]]);
        if (idx % 2 === 0) sheet.getRange(row, 1, 1, 5).setBackground('#1e2333');
        row++;
      });
      row++;
    });
    row++;
  });

  autoResizeCols(sheet, 5);
  return { ok: true, sheet: sheetName };
}

// ------------------------------------------------------------
// 2. SAVE MATCH SCORE
//    Called after every match is completed.
//    Appends to sheet: "TournamentName_Matches"
// ------------------------------------------------------------
function saveMatchScore(data) {
  // data: { tournamentName, levelName, bracketLabel, round,
  //         team1, team2, score1, score2, winner, timestamp }
  const ss = getSS();
  const sheetName = sanitize(data.tournamentName) + '_Matches';
  let sheet = ss.getSheetByName(sheetName);
  const isNew = !sheet;
  if (isNew) sheet = ss.insertSheet(sheetName);

  if (isNew || sheet.getLastRow() === 0) {
    // Write header
    const hdrs = ['Timestamp', 'Level', 'Bracket', 'Round', 'Team 1', 'Score 1', 'Score 2', 'Team 2', 'Winner', 'Stage'];
    sheet.getRange(1, 1, 1, hdrs.length).setValues([hdrs]);
    headerStyle(sheet, 1, hdrs.length, '#1a1f2e', '#f0c040');
  }

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, 10).setValues([[
    data.timestamp || new Date().toISOString(),
    data.levelName,
    data.bracketLabel,
    data.round || '',
    formatPairGS(data.team1),
    data.score1,
    data.score2,
    formatPairGS(data.team2),
    formatPairGS(data.winner),
    data.stage || 'Round Robin'
  ]]);

  // Colour winner row
  const winnerCol = data.score1 > data.score2 ? 5 : 8;
  sheet.getRange(nextRow, winnerCol).setFontColor('#3dd68c').setFontWeight('bold');

  autoResizeCols(sheet, 10);
  return { ok: true, row: nextRow };
}

// ------------------------------------------------------------
// 3. SAVE FINAL STANDINGS
//    Called at end of tournament.
//    Creates/updates sheet: "TournamentName_Standings"
// ------------------------------------------------------------
function saveFinalStandings(data) {
  // data: { tournamentName, levels: [{ name, brackets: [{ label, standings: [{pair,W,L,PF,PA,pts}] }] }] }
  const ss = getSS();
  const sheetName = sanitize(data.tournamentName) + '_Standings';
  const sheet = getOrCreateSheet(ss, sheetName);
  sheet.clearContents();
  sheet.clearFormats();

  let row = 1;

  sheet.getRange(row, 1, 1, 7).merge()
    .setValue('FINAL STANDINGS — ' + data.tournamentName.toUpperCase())
    .setBackground('#1a1f2e').setFontColor('#f0c040')
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  row += 2;

  data.levels.forEach(level => {
    sectionHeader(sheet, row, 7, 'LEVEL: ' + level.name.toUpperCase(), '#242938');
    row++;

    level.brackets.forEach(bracket => {
      sectionHeader(sheet, row, 7, bracket.label, '#2d3347');
      row++;

      const hdrs = ['Rank', 'Pair', 'W', 'L', 'PF', 'PA', 'Pts'];
      sheet.getRange(row, 1, 1, 7).setValues([hdrs]);
      headerStyle(sheet, row, 7, '#363d56', '#f0c040');
      row++;

      bracket.standings.forEach((s, idx) => {
        const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1) + '';
        sheet.getRange(row, 1, 1, 7).setValues([[
          rankEmoji,
          formatPairGS(s.pair),
          s.W, s.L, s.PF, s.PA, s.pts
        ]]);
        if (idx === 0) {
          sheet.getRange(row, 1, 1, 7).setBackground('#2a3a1e').setFontColor('#3dd68c');
        } else if (idx % 2 === 0) {
          sheet.getRange(row, 1, 1, 7).setBackground('#1e2333');
        }
        row++;
      });
      row++;
    });
    row++;
  });

  autoResizeCols(sheet, 7);
  return { ok: true, sheet: sheetName };
}

// ------------------------------------------------------------
// 4. SAVE CROSSOVER RESULTS
//    Called after each crossover match and at completion.
// ------------------------------------------------------------
function saveCrossoverResult(data) {
  // data: { tournamentName, stages: [{ name, matches: [{t1,t2,score1,score2,winner}] }] }
  const ss = getSS();
  const sheetName = sanitize(data.tournamentName) + '_Crossover';
  const sheet = getOrCreateSheet(ss, sheetName);
  sheet.clearContents();
  sheet.clearFormats();

  let row = 1;

  sheet.getRange(row, 1, 1, 6).merge()
    .setValue('CROSSOVER BRACKET — ' + data.tournamentName.toUpperCase())
    .setBackground('#1a1f2e').setFontColor('#f0c040')
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  row += 2;

  data.stages.forEach(stage => {
    sectionHeader(sheet, row, 6, '▶  ' + stage.name.toUpperCase(), '#242938');
    row++;

    const hdrs = ['Team 1', 'Score 1', 'Score 2', 'Team 2', 'Winner', 'Status'];
    sheet.getRange(row, 1, 1, 6).setValues([hdrs]);
    headerStyle(sheet, row, 6, '#363d56', '#f0c040');
    row++;

    stage.matches.forEach(m => {
      const status = m.status === 'finished' ? 'Completed' : m.status === 'bye' ? 'BYE' : 'Pending';
      sheet.getRange(row, 1, 1, 6).setValues([[
        m.t1 ? formatPairGS(m.t1.pair) : 'TBD',
        m.score1 !== null ? m.score1 : '',
        m.score2 !== null ? m.score2 : '',
        m.t2 ? formatPairGS(m.t2.pair) : 'TBD',
        m.winner ? formatPairGS(m.winner.pair) : '',
        status
      ]]);
      if (m.status === 'finished') {
        sheet.getRange(row, 5).setFontColor('#3dd68c').setFontWeight('bold');
      }
      if (row % 2 === 0) sheet.getRange(row, 1, 1, 6).setBackground('#1e2333');
      row++;
    });
    row++;
  });

  autoResizeCols(sheet, 6);
  return { ok: true, sheet: sheetName };
}

// ------------------------------------------------------------
// 5. END TOURNAMENT
//    Writes a summary row to the master "TournamentHistory" sheet
//    and stamps all tournament sheets as finalised.
// ------------------------------------------------------------
function endTournament(data) {
  // data: { tournamentName, category, totalPlayers, champion, runnerUp,
  //         totalMatches, endedAt, createdAt }
  const ss = getSS();

  // ── History sheet ──
  const histSheet = getOrCreateSheet(ss, 'TournamentHistory');
  if (histSheet.getLastRow() === 0) {
    const hdrs = ['#', 'Tournament', 'Category', 'Players', 'Champion', 'Runner-Up', 'Matches', 'Started', 'Ended'];
    histSheet.getRange(1, 1, 1, hdrs.length).setValues([hdrs]);
    headerStyle(histSheet, 1, hdrs.length, '#1a1f2e', '#f0c040');
  }

  const nextRow = histSheet.getLastRow() + 1;
  histSheet.getRange(nextRow, 1, 1, 9).setValues([[
    nextRow - 1,
    data.tournamentName,
    data.category,
    data.totalPlayers,
    data.champion || '—',
    data.runnerUp  || '—',
    data.totalMatches,
    data.createdAt,
    data.endedAt || new Date().toISOString()
  ]]);
  histSheet.getRange(nextRow, 5).setFontColor('#f0c040').setFontWeight('bold');
  autoResizeCols(histSheet, 9);

  // ── Stamp each tournament sheet ──
  const prefix = sanitize(data.tournamentName);
  ['_Setup','_Matches','_Standings','_Crossover'].forEach(suffix => {
    const s = ss.getSheetByName(prefix + suffix);
    if (s) {
      const lastCol = s.getLastColumn() || 1;
      s.getRange(2, lastCol + 2).setValue('✓ FINALISED: ' + (data.endedAt || new Date().toISOString()))
        .setFontColor('#3dd68c').setFontWeight('bold');
    }
  });

  return { ok: true, historyRow: nextRow - 1 };
}

// ------------------------------------------------------------
// 6. GET HISTORY
//    Returns all rows from TournamentHistory sheet as JSON.
// ------------------------------------------------------------
function getHistory() {
  const ss = getSS();
  const sheet = ss.getSheetByName('TournamentHistory');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, history: [] };

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  const history = rows.map(r => ({
    id:           r[0],
    name:         r[1],
    category:     r[2],
    totalPlayers: r[3],
    champion:     r[4],
    runnerUp:     r[5],
    totalMatches: r[6],
    createdAt:    r[7],
    endedAt:      r[8]
  }));
  return { ok: true, history };
}

// ------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------
function sanitize(name) {
  return (name || 'Tournament').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 40);
}

function formatPairGS(pair) {
  if (!pair) return '';
  if (typeof pair === 'string') return pair;
  if (Array.isArray(pair)) return pair.filter(Boolean).join(' / ');
  return String(pair);
}
