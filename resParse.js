// Smart text report: turn a plain message (English or Hinglish) into a case form.
//   "flood in sector 4, 200 log phase hain, paani aur dawai chahiye, urgent"
//   -> type flood, P1, 200 people, water + medicine for 200 people, location "sector 4"
// Rule-based (keywords + numbers), no external service, and it says which words it used.

const RES_TYPE_WORDS = [
  ['earthquake', /\b(earthquake|quake|tremor|bhu?ka?mp|bhookamp|bhukamp|building (collapse|collapsed)|collapsed?|debris|malba)\b/],
  ['flood', /\b(flood(ed|ing)?|baa?dh|paani bhar|pani bhar|water ?logg(ed|ing)|bhar gaya|submerged|dooba|doob)\b/],
  ['fire', /\b(fire|aag|burn(ing|t)?|smoke|dhuan|blaze|jal raha|jal rahi|explosion|blast)\b/],
  ['medical', /\b(medical|injur(ed|y|ies)|ghayal|heat ?stroke|bimar|beemar|sick|unconscious|behosh|bleeding|khoon|hospital|ambulance|fever|bukhar|cholera|diarrh?o?ea|outbreak)\b/],
];

const RES_NEED_WORDS = {
  water: /\b(water|paani|pani|drinking|peene)\b/,
  food: /\b(food|khana|khaana|rashan|ration|meals?|bhojan|packets?|roti|anaj)\b/,
  medicine: /\b(medicines?|dawai|dawa|dava|davai|first ?aid|medical kits?|bandage|tablets?|ors)\b/,
  cots: /\b(cots?|beds?|bistar|shelter|tents?|blankets?|kambal|rehne ki jagah)\b/,
  vehicles: /\b(vehicles?|trucks?|boats?|naav|nav|ambulances?|gaadi|gadi|bus|tractor|rescue team)\b/,
};

// per person, roughly one day
const RES_PER_PERSON = { water: 1, food: 0.6, medicine: 0.25, cots: 0.3 };

const RES_URGENT = /\b(urgent|urgently|critical|emergency|trapped|fa(n|ns)se|phase|phas(e|a)|dying|mar rahe|bleeding|unconscious|behosh|collapsed?|jaldi|turant|abhi|immediately|asap|serious|gambhir|sos|bachao|help!+)\b/;
const RES_HIGH = /\b(injured|ghayal|children|bachche|bacche|elderly|buzurg|pregnant|garbhvati|old age|disabled|night|raat)\b/;
const RES_LOW = /\b(not urgent|no hurry|whenever|kal tak|tomorrow|kal|routine|later|baad mein)\b/;

// "50 tents", "2 ambulance", "20 litre water": a number right before the keyword (one unit word allowed)
function resNumberBefore(resText, resWordRx) {
  const resM = resText.match(resWordRx);
  if (!resM) return null;
  const resBefore = resText.slice(Math.max(0, resM.index - 25), resM.index);
  const resN = resBefore.match(/(\d[\d,]*)\s*(?:(?!and\b|aur\b|or\b)[a-z]+\s+)?$/);
  return resN ? parseInt(resN[1].replace(/,/g, ''), 10) : null;
}

export function resParseReport(resRaw) {
  const resText = String(resRaw || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const resUsed = [];
  if (!resText) return { ok: false, used: [], form: {} };

  // 1. type
  let resType = 'other';
  for (const [resT, resRx] of RES_TYPE_WORDS) {
    const resM = resText.match(resRx);
    if (resM) {
      resType = resT;
      resUsed.push({ word: resM[0], meaning: `type: ${resT}` });
      break;
    }
  }

  // 2. people
  let resPeople = null;
  const resPm = resText.match(/(\d[\d,]*)\s*(?:\+\s*)?(people|persons?|log|logon|logo|lok|families|family|parivar|pariwar|ghar|houses|bachche|bacche|children|students|villagers|residents|workers|patients|mareez)/);
  if (resPm) {
    const resN = parseInt(resPm[1].replace(/,/g, ''), 10);
    const resFamilies = /famil|parivar|pariwar|ghar|houses/.test(resPm[2]);
    resPeople = resFamilies ? resN * 4 : resN;
    resUsed.push({ word: resPm[0], meaning: `${resPeople} people${resFamilies ? ' (4 per family)' : ''}` });
  }
  const resPeopleOrDefault = Math.min(100000, Math.max(1, resPeople || 20));

  // 3. needs ("paani bhar gaya" is a flood, not a request for water)
  const resNeedText = resText.replace(/paani bhar|pani bhar|bhar gaya|water ?logg\w*/g, ' ');
  const resNeeds = {};
  for (const [resK, resRx] of Object.entries(RES_NEED_WORDS)) {
    const resM = resNeedText.match(resRx);
    if (!resM) continue;
    const resGiven = resNumberBefore(resNeedText, resRx);
    let resQty;
    if (resGiven && resGiven !== resPeople) resQty = resGiven;
    else if (resK === 'vehicles') resQty = Math.max(1, Math.min(6, Math.ceil(resPeopleOrDefault / 80)));
    else resQty = Math.max(1, Math.ceil(resPeopleOrDefault * RES_PER_PERSON[resK]));
    resNeeds[resK] = resQty;
    resUsed.push({ word: resM[0], meaning: `${resK}: ${resQty}${resGiven && resGiven !== resPeople ? '' : ' (estimated from people)'}` });
  }
  if (!Object.keys(resNeeds).length) {
    // nothing named: basic relief kit for the people mentioned
    resNeeds.water = Math.ceil(resPeopleOrDefault * RES_PER_PERSON.water);
    resNeeds.food = Math.ceil(resPeopleOrDefault * RES_PER_PERSON.food);
    if (resType === 'medical' || resType === 'earthquake' || resType === 'fire') resNeeds.medicine = Math.ceil(resPeopleOrDefault * RES_PER_PERSON.medicine);
    resUsed.push({ word: '(no supplies named)', meaning: 'basic relief kit estimated from people' });
  }

  // 4. priority
  let resPriority = 3;
  const resU = resText.match(RES_URGENT);
  const resH = resText.match(RES_HIGH);
  const resL = resText.match(RES_LOW);
  if (resU) {
    resPriority = 1;
    resUsed.push({ word: resU[0], meaning: 'priority P1 (life at risk)' });
  } else if (resL) {
    resPriority = 4;
    resUsed.push({ word: resL[0], meaning: 'priority P4 (can wait)' });
  } else if (resH || ['fire', 'earthquake'].includes(resType) || resPeopleOrDefault >= 150) {
    resPriority = 2;
    resUsed.push({ word: resH ? resH[0] : resType !== 'other' ? resType : `${resPeopleOrDefault} people`, meaning: 'priority P2' });
  }

  // 5. zone and place
  let resZone = null;
  const resZm = resText.match(/\bzone\s*([abcd])\b/);
  if (resZm) {
    resZone = `Zone ${resZm[1].toUpperCase()}`;
    resUsed.push({ word: resZm[0], meaning: resZone });
  }
  let resPlace = '';
  const resLm = String(resRaw).match(/\b(?:at|in|near|ke paas|mein|me|pe|par)\s+((?:sector|block|ward|gali|road|street|village|gaon|colony|nagar|market|school|camp|bridge|station)\s*[\w-]*(?:\s+[A-Z][\w-]*)*|[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3})/);
  const resSm = String(resRaw).match(/\b(sector|block|ward)\s*-?\s*\d+\w*/i);
  const resPost = String(resRaw).match(/\b([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3})\s+(?:pe|par|mein|me|ke paas)\b/);
  if (resLm) resPlace = resLm[1].trim();
  else if (resPost && !/^Zone\b/.test(resPost[1])) resPlace = resPost[1].trim();
  else if (resSm) resPlace = resSm[0].trim();
  if (resPlace) resUsed.push({ word: resPlace, meaning: 'location' });

  const resTypeName = { flood: 'Flooding', fire: 'Fire', earthquake: 'Earthquake damage', medical: 'Medical emergency', other: 'Relief needed' }[resType];
  const resTitle = `${resTypeName}${resPlace ? ` at ${resPlace}` : ''}${resPeople ? `, ${resPeople} people` : ''}`.slice(0, 150);

  return {
    ok: true,
    used: resUsed,
    form: {
      title: resTitle,
      case_type: resType,
      priority: resPriority,
      people_affected: resPeopleOrDefault,
      location: resPlace || 'Reported by message',
      ...(resZone ? { zone: resZone } : {}),
      food: resNeeds.food || 0,
      water: resNeeds.water || 0,
      medicine: resNeeds.medicine || 0,
      cots: resNeeds.cots || 0,
      vehicles: resNeeds.vehicles || 0,
    },
  };
}
