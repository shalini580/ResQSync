// ML risk model - logistic regression written from scratch (no library).
//
// Question it answers: "how likely is this emergency to turn critical if we
// don't serve it soon?"  -> a risk between 0 and 1.
//
// Inputs (features), all scaled to 0..1:
//   priority (P1/P2/P3 as 0/1 flags), case type (fire/earthquake/flood/medical),
//   people affected, minutes already waited, share of medicine in the request.
//
// Training data: we have no real disaster history, so the model is trained on
// simulated past incidents (3000 rows, fixed seed so every run is the same).
// 80% is used to train, 20% is kept aside to test how good it is.
//
// The allocator uses the risk like this (see resAllocator.js):
//   1. priority P1 -> P4 still decides first (emergency comes first)
//   2. inside the same priority: score = 0.6 * risk + 0.4 * nearness to the depot
//   3. risk >= 0.85 moves a case up one priority level (like aging)

export const RES_FEATURES = [
  { key: 'p1', label: 'Priority P1' },
  { key: 'p2', label: 'Priority P2' },
  { key: 'p3', label: 'Priority P3' },
  { key: 'fire', label: 'Type: fire' },
  { key: 'earthquake', label: 'Type: earthquake' },
  { key: 'flood', label: 'Type: flood' },
  { key: 'medical', label: 'Type: medical' },
  { key: 'people', label: 'People affected' },
  { key: 'wait', label: 'Time already waited' },
  { key: 'medShare', label: 'Medicine share of request' },
];

// the "real world" the simulated history is drawn from (the model never sees these numbers)
const RES_TRUE_BIAS = -6.6;
const RES_TRUE_WEIGHTS = [4.5, 2.6, 1.0, 1.6, 1.4, 1.0, 1.3, 3.5, 2.4, 1.9];

const RES_TYPES = ['flood', 'fire', 'earthquake', 'medical', 'other'];
const RES_QTY = ['food', 'water', 'medicine', 'cots', 'vehicles'];

let resModel = null;

// ------------------------------------------------------------------ helpers

// small seeded random generator (mulberry32), so training gives the same model every time
function resRandom(resSeed) {
  let resA = resSeed >>> 0;
  return () => {
    resA = (resA + 0x6d2b79f5) >>> 0;
    let resT = resA;
    resT = Math.imul(resT ^ (resT >>> 15), resT | 1);
    resT ^= resT + Math.imul(resT ^ (resT >>> 7), resT | 61);
    return ((resT ^ (resT >>> 14)) >>> 0) / 4294967296;
  };
}

const resSigmoid = (resZ) => 1 / (1 + Math.exp(-resZ));
const resDot = (resW, resX) => resW.reduce((resA, resWi, resI) => resA + resWi * resX[resI], 0);

/** turns one case/request into the 10 numbers the model reads */
export function resFeaturesOf(resInput) {
  const resPriority = Number(resInput.priority) || 4;
  const resType = String(resInput.case_type || 'other');
  const resPeople = Math.max(0, Number(resInput.people_affected ?? resInput.people ?? 10));
  const resWait = Math.max(0, Number(resInput.waitMin || 0));
  const resTotal = RES_QTY.reduce((resA, resK) => resA + Math.max(0, Number(resInput[resK] || 0)), 0);
  const resMed = resTotal ? Math.max(0, Number(resInput.medicine || 0)) / resTotal : 0;
  return [
    resPriority === 1 ? 1 : 0,
    resPriority === 2 ? 1 : 0,
    resPriority === 3 ? 1 : 0,
    resType === 'fire' ? 1 : 0,
    resType === 'earthquake' ? 1 : 0,
    resType === 'flood' ? 1 : 0,
    resType === 'medical' ? 1 : 0,
    Math.min(1, Math.log1p(resPeople) / Math.log1p(1000)),
    Math.min(1, resWait / 120),
    resMed,
  ];
}

// ------------------------------------------------------------------ simulated history

function resSimulate(resCount, resSeed) {
  const resRand = resRandom(resSeed);
  const resRows = [];
  for (let resI = 0; resI < resCount; resI++) {
    const resR = resRand();
    const resPriority = resR < 0.2 ? 1 : resR < 0.5 ? 2 : resR < 0.8 ? 3 : 4;
    const resType = RES_TYPES[Math.floor(resRand() * RES_TYPES.length)];
    // people affected: mostly small groups, sometimes hundreds
    const resPeople = Math.round(Math.exp(1.6 + resRand() * 4.6));
    const resQty = { food: resRand() * 100, water: resRand() * 100, medicine: resRand() * 60, cots: resRand() * 40, vehicles: resRand() * 4 };
    const resInput = { priority: resPriority, case_type: resType, people_affected: resPeople, waitMin: resRand() * 150, ...resQty };
    const resX = resFeaturesOf(resInput);
    // label = did the situation turn critical? (random draw, so the data is noisy like real life)
    const resP = resSigmoid(RES_TRUE_BIAS + resDot(RES_TRUE_WEIGHTS, resX));
    resRows.push({ resX, resY: resRand() < resP ? 1 : 0, resPriority });
  }
  return resRows;
}

// ------------------------------------------------------------------ training (batch gradient descent)

function resFit(resRows, resEpochs = 900, resRate = 0.8, resL2 = 0.001) {
  const resN = resRows.length;
  const resD = RES_FEATURES.length;
  let resW = new Array(resD).fill(0);
  let resB = 0;
  const resLossCurve = [];
  for (let resE = 0; resE < resEpochs; resE++) {
    const resGw = new Array(resD).fill(0);
    let resGb = 0;
    let resLoss = 0;
    for (const { resX, resY } of resRows) {
      const resP = resSigmoid(resB + resDot(resW, resX));
      const resErr = resP - resY;
      for (let resJ = 0; resJ < resD; resJ++) resGw[resJ] += resErr * resX[resJ];
      resGb += resErr;
      resLoss += -(resY * Math.log(resP + 1e-12) + (1 - resY) * Math.log(1 - resP + 1e-12));
    }
    resW = resW.map((resWj, resJ) => resWj - resRate * (resGw[resJ] / resN + resL2 * resWj));
    resB -= resRate * (resGb / resN);
    if (resE % 100 === 0 || resE === resEpochs - 1) resLossCurve.push({ epoch: resE, loss: +(resLoss / resN).toFixed(4) });
  }
  return { resW, resB, resLossCurve };
}

function resEvaluate(resRows, resPredict) {
  let resTp = 0, resFp = 0, resTn = 0, resFn = 0;
  const resScored = resRows.map((resR) => ({ resP: resPredict(resR), resY: resR.resY }));
  for (const { resP, resY } of resScored) {
    const resHat = resP >= 0.5 ? 1 : 0;
    if (resHat && resY) resTp++;
    else if (resHat && !resY) resFp++;
    else if (!resHat && resY) resFn++;
    else resTn++;
  }
  // AUC = chance a random critical case gets a higher score than a random non-critical one
  const resPos = resScored.filter((resS) => resS.resY === 1);
  const resNeg = resScored.filter((resS) => resS.resY === 0);
  let resWins = 0;
  for (const resA of resPos) for (const resBb of resNeg) resWins += resA.resP > resBb.resP ? 1 : resA.resP === resBb.resP ? 0.5 : 0;
  const resPrecision = resTp + resFp ? resTp / (resTp + resFp) : 0;
  const resRecall = resTp + resFn ? resTp / (resTp + resFn) : 0;
  const resPct = (resV) => Math.round(resV * 1000) / 10;
  return {
    accuracy: resPct((resTp + resTn) / resRows.length),
    precision: resPct(resPrecision),
    recall: resPct(resRecall),
    f1: resPct(resPrecision + resRecall ? (2 * resPrecision * resRecall) / (resPrecision + resRecall) : 0),
    auc: resPct(resPos.length && resNeg.length ? resWins / (resPos.length * resNeg.length) : 0),
    confusion: { tp: resTp, fp: resFp, tn: resTn, fn: resFn },
  };
}

/** trains (or re-trains) the model and keeps it in memory */
export function resTrainModel(resSeed = 42, resSamples = 3000) {
  const resStart = Date.now();
  const resRows = resSimulate(resSamples, resSeed);
  const resCut = Math.floor(resRows.length * 0.8);
  const resTrain = resRows.slice(0, resCut);
  const resTest = resRows.slice(resCut);
  const { resW, resB, resLossCurve } = resFit(resTrain);

  const resModelPredict = (resR) => resSigmoid(resB + resDot(resW, resR.resX));
  // baseline to beat: "only P1 is critical", what a priority-only system assumes
  const resRulePredict = (resR) => (resR.resPriority === 1 ? 1 : 0);

  resModel = {
    weights: resW,
    bias: resB,
    seed: resSeed,
    samples: resSamples,
    trainRows: resTrain.length,
    testRows: resTest.length,
    criticalShare: Math.round((100 * resRows.filter((resR) => resR.resY).length) / resRows.length),
    trainedAt: new Date().toISOString(),
    trainMs: Date.now() - resStart,
    lossCurve: resLossCurve,
    test: resEvaluate(resTest, resModelPredict),
    baseline: resEvaluate(resTest, resRulePredict),
  };
  return resModelInfo();
}

export function resModelInfo() {
  if (!resModel) resTrainModel();
  return {
    algorithm: 'Logistic regression (batch gradient descent, L2)',
    features: RES_FEATURES.map((resF, resI) => ({ ...resF, weight: +resModel.weights[resI].toFixed(3) })),
    bias: +resModel.bias.toFixed(3),
    seed: resModel.seed,
    samples: resModel.samples,
    trainRows: resModel.trainRows,
    testRows: resModel.testRows,
    criticalShare: resModel.criticalShare,
    trainedAt: resModel.trainedAt,
    trainMs: resModel.trainMs,
    lossCurve: resModel.lossCurve,
    test: resModel.test,
    baseline: resModel.baseline,
  };
}

/** risk for one case, plus how much each feature pushed it up or down */
export function resPredictRisk(resInput) {
  if (!resModel) resTrainModel();
  const resX = resFeaturesOf(resInput);
  const resZ = resModel.bias + resDot(resModel.weights, resX);
  const resContrib = RES_FEATURES.map((resF, resI) => ({
    key: resF.key, label: resF.label, value: +resX[resI].toFixed(3), impact: +(resModel.weights[resI] * resX[resI]).toFixed(3),
  })).filter((resC) => resC.value !== 0);
  return { risk: +resSigmoid(resZ).toFixed(4), contributions: resContrib.sort((resA, resB) => Math.abs(resB.impact) - Math.abs(resA.impact)) };
}

/** just the number - used thousands of times by the scheduler */
export function resRiskOf(resInput) {
  if (!resModel) resTrainModel();
  return resSigmoid(resModel.bias + resDot(resModel.weights, resFeaturesOf(resInput)));
}
