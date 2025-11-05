// generate_rct_data.js
const fs = require('fs');

// Helper: Random integer between min (inclusive) and max (inclusive)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Random float with 1 decimal
function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

// Helper: Weighted random choice
function weightedChoice(options, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
}

// Define groups
const groups = ['Full_Platform', 'Active_Control', 'Waitlist'];
let groupCounts = { Full_Platform: 0, Active_Control: 0, Waitlist: 0 };
const targetPerGroup = 100;

// Demographics
const genders = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const genderWeights = [78, 18, 3, 1]; // Reflecting your sample

const ethnicities = ['White', 'Asian', 'Black', 'Hispanic', 'Other'];
const ethnicityWeights = [82, 8, 4, 4, 2];

// Generate 300 participants
const participants = [];
const hrvData = [];
const outcomesData = [];

for (let i = 1; i <= 300; i++) {
  const pid = `P${String(i).padStart(3, '0')}`;

  // Assign group to balance 100 per arm
  let group;
  if (groupCounts.Full_Platform < targetPerGroup) group = 'Full_Platform';
  else if (groupCounts.Active_Control < targetPerGroup) group = 'Active_Control';
  else group = 'Waitlist';
  groupCounts[group]++;

  const age = randInt(18, 65);
  const gender = weightedChoice(genders, genderWeights);
  const ethnicity = weightedChoice(ethnicities, ethnicityWeights);

  // Baseline clinical scores (ensure PHQ9 >=10 or GAD7 >=10)
  let phq9, gad7, pss10;
  do {
    phq9 = randInt(5, 20);
    gad7 = randInt(5, 18);
    pss10 = randInt(15, 35);
  } while (phq9 < 10 && gad7 < 10);

  const tas20 = randInt(50, 75); // Alexithymia
  const brs = randInt(12, 24);   // Resilience (lower = less resilient)
  const srhi = randInt(25, 50);  // Habit strength

  participants.push({
    Participant_ID: pid,
    Group: group,
    Age: age,
    Gender: gender,
    Ethnicity: ethnicity,
    Baseline_PHQ9: phq9,
    Baseline_GAD7: gad7,
    Baseline_PSS10: pss10,
    Baseline_TAS20: tas20,
    Baseline_BRS: brs,
    Baseline_SRHI: srhi
  });

  // === HRV METRICS (only for Full_Platform and Active_Control) ===
  if (group !== 'Waitlist') {
    // Baseline HRV
    const baselineRMSSD = randFloat(25, 45);
    const baselineSDNN = randFloat(35, 55);
    const baselineTotalPower = randFloat(800, 1400);
    hrvData.push({
      Participant_ID: pid,
      Timepoint: 'Baseline',
      RMSSD: baselineRMSSD,
      SDNN: baselineSDNN,
      Total_Power: baselineTotalPower,
      Welltory_Stress: Math.round(100 - (baselineRMSSD / 45) * 60), // inverse
      Welltory_Energy: Math.round((baselineRMSSD / 45) * 60),
      Welltory_Resilience: Math.round((baselineRMSSD / 45) * 70 + 30),
      Welltory_Balance: parseFloat((baselineRMSSD / 50).toFixed(2)),
      Welltory_Coherence: parseFloat((baselineRMSSD / 55).toFixed(2))
    });

    // Post-intervention HRV (improved only in Full_Platform)
    let postRMSSD = baselineRMSSD;
    if (group === 'Full_Platform') {
      postRMSSD = Math.min(70, baselineRMSSD + randFloat(8, 16));
    } else {
      postRMSSD = baselineRMSSD + randFloat(0, 4); // small drift
    }
    const postSDNN = postRMSSD * 1.2;
    const postTotalPower = 1000 + postRMSSD * 20;

    hrvData.push({
      Participant_ID: pid,
      Timepoint: 'Post_Intervention',
      RMSSD: parseFloat(postRMSSD.toFixed(1)),
      SDNN: parseFloat(postSDNN.toFixed(1)),
      Total_Power: parseFloat(postTotalPower.toFixed(1)),
      Welltory_Stress: Math.round(100 - (postRMSSD / 70) * 70),
      Welltory_Energy: Math.round((postRMSSD / 70) * 70),
      Welltory_Resilience: Math.round((postRMSSD / 70) * 80 + 20),
      Welltory_Balance: parseFloat((postRMSSD / 70).toFixed(2)),
      Welltory_Coherence: parseFloat((postRMSSD / 70).toFixed(2))
    });
  }

  // === OUTCOMES ===
  // Simulate improvement based on group
  let deltaPSS = 0, deltaPHQ = 0, deltaGAD = 0;
  if (group === 'Full_Platform') {
    deltaPSS = -randInt(6, 10);
    deltaPHQ = -randInt(3, 6);
    deltaGAD = -randInt(3, 6);
  } else if (group === 'Active_Control') {
    deltaPSS = -randInt(3, 6);
    deltaPHQ = -randInt(2, 4);
    deltaGAD = -randInt(2, 4);
  } else {
    // Waitlist: slight drift
    deltaPSS = randInt(-2, 1);
    deltaPHQ = randInt(-1, 2);
    deltaGAD = randInt(-1, 2);
  }

  const postPSS = Math.max(5, Math.min(40, pss10 + deltaPSS));
  const postPHQ = Math.max(0, Math.min(27, phq9 + deltaPHQ));
  const postGAD = Math.max(0, Math.min(21, gad7 + deltaGAD));

  outcomesData.push({
    Participant_ID: pid,
    Timepoint: 'Post_Intervention',
    PHQ9: postPHQ,
    GAD7: postGAD,
    PSS10: postPSS,
    TAS20: Math.max(40, tas20 + (group === 'Full_Platform' ? -randInt(6,10) : -randInt(2,5))),
    BRS: Math.min(30, brs + (group === 'Full_Platform' ? randInt(3,6) : randInt(1,3))),
    SRHI: Math.min(84, srhi + randInt(5,12)),
    SUS_Score: group !== 'Waitlist' ? randInt(75, 95) : ''
  });

  // Optional: Follow-up (3 months)
  // (omitted for brevity; can be added similarly)
}

// === WRITE CSVs ===

function toCSV(data, fields) {
  const header = fields.join(',');
  const rows = data.map(row => fields.map(f => {
    const val = row[f];
    if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
    return val;
  }).join(','));
  return [header, ...rows].join('\n');
}

// Participants
const partFields = ['Participant_ID','Group','Age','Gender','Ethnicity','Baseline_PHQ9','Baseline_GAD7','Baseline_PSS10','Baseline_TAS20','Baseline_BRS','Baseline_SRHI'];
fs.writeFileSync('Participants_Data.csv', toCSV(participants, partFields));

// HRV
const hrvFields = ['Participant_ID','Timepoint','RMSSD','SDNN','Total_Power','Welltory_Stress','Welltory_Energy','Welltory_Resilience','Welltory_Balance','Welltory_Coherence'];
fs.writeFileSync('HRV_Metrics.csv', toCSV(hrvData, hrvFields));

// Outcomes
const outFields = ['Participant_ID','Timepoint','PHQ9','GAD7','PSS10','TAS20','BRS','SRHI','SUS_Score'];
fs.writeFileSync('Post_Intervention_Outcomes.csv', toCSV(outcomesData, outFields));

console.log('✅ Generated 300 synthetic participants in:');
console.log('- Participants_Data.csv');
console.log('- HRV_Metrics.csv');
console.log('- Post_Intervention_Outcomes.csv');
