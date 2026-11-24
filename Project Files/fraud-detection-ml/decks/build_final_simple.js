const pptxgen = require("pptxgenjs");
let applyTheme = async () => {}; try { applyTheme = require("/mnt/skills/public/pptx/scripts/apply_theme.js").applyTheme; } catch (e) {} // optional: only used to polish the theme XML
const path = require("path"), OUT = path.join(__dirname, "out"); require("fs").mkdirSync(OUT, { recursive: true });
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

const THEME = {
  name: "Fraud Signal",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "17252A", lt1: "FFFFFF", dk2: "2B7A78", lt2: "E3F4F2",
    accent1: "2B7A78", accent2: "E4572E", accent3: "F2B134",
    accent4: "3AAFA9", accent5: "5C6B73", accent6: "9BC1BC",
    hlink: "2B7A78", folHlink: "5C6B73",
  },
};

async function icon(Comp, color = "#FFFFFF") {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color, size: "256" }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = "Credit Card Fraud Detection - ML Project Final Presentation";
  const C = pres.SchemeColor;

  // ---------- layouts ----------
  pres.defineSlideMaster({
    title: "TITLE_DARK",
    background: { color: C.text1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.8, w: 8.2, h: 2.6, fontSize: 48, bold: true, color: C.background1, margin: 0, align: "left", valign: "bottom" }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: 0.8, y: 4.7, w: 8.2, h: 1.0, fontSize: 20, color: C.background2, margin: 0, valign: "top" }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.background1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.4, w: 11.9, h: 1.0, fontSize: 36, bold: true, color: C.text1, margin: 0, align: "left", valign: "middle" }, text: "" } },
      { text: { text: "Credit Card Fraud Detection  |  ML Project Final Presentation", options: { x: 0.7, y: 6.95, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
    ],
    slideNumber: { x: 11.9, y: 6.95, w: 0.7, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
  });

  pres.addSection({ title: "Proposal" });
  const SEC = "Proposal";

  // helpers
  const card = (s, x, y, w, h, name, fill = C.background2) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name });
  const circleIcon = async (s, Comp, x, y, d, name, fill = C.accent1, color = "#FFFFFF") => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name + " circle" });
    const p = d * 0.22;
    s.addImage({ data: await icon(Comp, color), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: name + " icon", altText: name });
  };
  const text = (s, t, o) => s.addText(t, Object.assign({ isTextBox: true, margin: 0, color: C.text1, valign: "top" }, o));

  const R = require(path.join(__dirname, "..", "reports", "results.json"));
  const D = R.dataset, M = Object.fromEntries(R.models.map(m => [m.key, m])), E = R.eda;
  const p1 = x => (x * 100).toFixed(1) + "%", f2 = x => x.toFixed(2), f3 = x => x.toFixed(3), k = x => Math.round(x / 1000) + "K";
  const best = M[R.best_model], notes = [];
  let slideNo = 1; const slide = (t, who, note) => { slideNo++; const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC }); s.addText(t, { placeholder: "title" }); notes.push([who, note]); s.addNotes(who + ": " + note); return s; };
  const cards = (s, items, y, h, n) => items.forEach(([Ic, hd, b], i) => { const w = (11.9 - (n - 1) * 0.3) / n, x = 0.7 + i * (w + 0.3);
    card(s, x, y, w, h, "Card " + (i + 1)); ci(s, Ic, x + 0.3, y + 0.3, 0.7, hd);
    text(s, hd, { x: x + 0.3, y: y + 1.2, w: w - 0.6, h: 0.45, fontSize: 19, bold: true }); text(s, b, { x: x + 0.3, y: y + 1.75, w: w - 0.6, h: h - 1.9, fontSize: 15 }); });
  const strip = (s, Ic, lead, rest, y = 5.5) => { card(s, 0.7, y, 11.9, 1.2, "Strip"); ci(s, Ic, 1.0, y + 0.2, 0.8, "Strip", C.accent3, "#17252A");
    text(s, [{ text: lead + " ", options: { bold: true } }, { text: rest }], { x: 2.1, y: y + 0.2, w: 10.2, h: 0.8, fontSize: 16, valign: "middle" }); };
  const pend = []; const ci = (...a) => pend.push(circleIcon(...a));
  const DC = require("./decks_common.js"), XC = { pres, C, card, text, ci, strip, R, fa };
  const sp = D.split, ms = R.models, cvf = m => `${f2(m.cv.mean_pr_auc)} \u00B1 ${f2(m.cv.std_pr_auc)}`;
  const person = (s, i, nm, Ic, mods, ex, y = 1.7, h = 3.5) => { const x = 0.7 + i * 6.1; card(s, x, y, 5.8, h, "Person " + nm); ci(s, Ic, x + 0.35, y + 0.3, 0.8, nm);
    text(s, nm, { x: x + 1.5, y: y + 0.4, w: 3.5, h: 0.6, fontSize: 26, bold: true });
    s.addText([{ text: "Models", options: { bold: true, breakLine: true } }].concat(mods.map(m => ({ text: m, options: { bullet: true, breakLine: true } }))).concat([{ text: "Also: ", options: { bold: true } }, { text: ex }]), { isTextBox: true, margin: 0, color: C.text1, valign: "top", x: x + 0.35, y: y + 1.4, w: 5.1, h: h - 1.5, fontSize: 16, paraSpaceAfter: 4 }); };


  const JM = ["Logistic regression", "Decision tree", "Random forest", "Extra trees"], LM = ["XGBoost (gradient boosting)", "LightGBM", "Linear SVM (calibrated)", "Naive Bayes"];
  const DR = R.dimred, SVDc = DR.svd_continuous.models, SVDa = DR.svd_all_models.models, g = (a, q) => a.find(m => m.key === q), nrow = x => x.toLocaleString("en-US");
  const DEMO = require(path.join(__dirname, "..", "reports", "demo_examples.json")), A = R.ablation, I = R.importance;
  const V = require(path.join(__dirname, "..", "reports", "sparkov_validity.json")), CVN = require(path.join(__dirname, "..", "reports", "cv_results.json")), FP = require(path.join(__dirname, "..", "reports", "first_pass_results.json")), BPJ = require(path.join(__dirname, "..", "reports", "boosting_probe.json"));
  const SH_ = DC.SH, FPM = Object.fromEntries(FP.models.map(m => [m.key, m])), pct0 = x => Math.round(x * 100) + "%";
  const rf = best, c = rf.test.confusion, ab = Object.fromEntries(A.map(a => [a.name[0], a]));
  const FN = { amt: "Amount", is_night: "Night hours", hour: "Hour of day", amt_ratio: "Amount vs average", amt_mean_past: "Typical amount", secs_since_prev: "Gap since last purchase", amt_z: "Amount z-score", txn_24h: "Purchases in 24h", age: "Customer age", txn_1h: "Purchases in 1h", dow: "Weekday", city_pop: "City size", dist_home_mi: "Distance from home" };
  const chartBase = { catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valGridLine: { style: "none" }, showLegend: false };
  const hi = [...ms].sort((a, b) => b.cv.std_pr_auc - a.cv.std_pr_auc)[0], lg = g(ms, "lgbm"), gb = g(ms, "gb"), lr = g(ms, "logreg"), sv = g(ms, "svm"), nb = g(ms, "nb"), tr = g(ms, "tree");
  const rfc = g(SVDc, "rf"), rfa = g(SVDa, "rf"), lgc = g(SVDc, "lgbm");
  // ---------- Final Presentation Simple: six high-level slides ----------
  const by = [...ms].sort((a, b) => b.test.pr_auc - a.test.pr_auc), cvGain = k2 => `${f2(FPM[k2].cv.mean_pr_auc)} to ${f2(M[k2].cv.mean_pr_auc)}`;
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: SEC });
  s.addText("Fraud Detection: Final Results", { placeholder: "title" });
  s.addText([{ text: "Machine Learning Project (short version)", options: { breakLine: true } }, { text: "Joshua Francis and Logan Digilormo" }], { placeholder: "subtitle" });
  [[9.0, 1.5, 3.2, 55, C.accent1], [11.2, 4.5, 1.8, 50, C.accent4], [9.3, 5.2, 1.1, 60, C.accent6], [11.6, 1.7, 0.7, 40, C.accent6]].forEach(([x, y, d, t, cl], i) => s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cl, transparency: t }, line: { color: cl, transparency: t, width: 0 }, objectName: "Decor " + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.5, w: 0.6, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: "Flagged dot" });
  const n1 = "Hi everyone, I'm Josh, and this is Logan. Our project is about catching credit card fraud with classical machine learning. In the next few minutes we'll show the problem, what we built, and what we found. Logan will start with the problem.";
  notes.push(["JOSH", n1]); s.addNotes("JOSH: " + n1);

  s = slide("The problem and the data", "LOGAN", `Thanks, Josh. Credit card fraud is rare: only about ${p1(D.fraud_rate)} of transactions, roughly one in a hundred. That makes it hard, because a model that always says not fraud is ${p1(D.dummy_accuracy)} accurate and catches nothing. So we judge models by PR-AUC and F1, not accuracy. Real card data is private, so we generated ours with Sparkov, a public simulator: ${nrow(D.rows)} transactions for ${D.customers} customers across 2025. We checked that the data follows the generator's own rules, but simulated fraud is simpler than real fraud, so we trust the comparisons between methods more than the exact scores. Josh will explain what we built.`);
  cards(s, [[fa.FaExclamationTriangle, "Rare events", `Fraud is ${p1(D.fraud_rate)} of transactions.`], [fa.FaDatabase, "Simulated data", `${nrow(D.rows)} transactions, ${D.customers} customers, 2025.`], [fa.FaBullseye, "Right yardstick", "PR-AUC and F1, not accuracy."]], 1.6, 3.2, 3);
  strip(s, fa.FaInfoCircle, "Caveat:", "simulated data is simpler than real fraud. Trust the comparisons between methods, not the exact scores.", 5.3);

  s = slide("What we built", "JOSH", `We compared eight classical models, four each, with no deep learning: logistic regression, a decision tree, a random forest and extra trees from me, and XGBoost, LightGBM, a linear support vector machine and Naive Bayes from Logan. Three choices matter most. First, history features: for every purchase we compare it with that customer's own earlier purchases, using only the past, so nothing leaks from the future. Second, time-ordered testing: models always train on earlier months and are tested on later ones, and December was held out and scored once. Third, we keep the data imbalanced but make the models care about the rare fraud cases, using class weights, a tuned cutoff, and PR-AUC and F1 instead of accuracy. Logan will show how we tuned the models.`);
  cards(s, [[fa.FaTree, "Eight models", "Four each, all classical: linear, trees, forests, boosting, SVM, Naive Bayes."], [fa.FaUserClock, "History features", "Each purchase compared with that customer's own past. Only earlier data, so no leakage."], [fa.FaCalendarAlt, "Time-ordered tests", "Train on earlier months, test on later. December held out, scored once."], [fa.FaBalanceScale, "Imbalance handled", "Class weights, tuned cutoff, PR-AUC and F1. Real fraud rate kept in tests."]], 1.6, 3.6, 4);
  strip(s, fa.FaCheckCircle, "No peeking:", "every setting was chosen on earlier months. The December test was scored once at the end.", 5.5);

  s = slide("Tuning the models", "LOGAN", `Thanks, Josh. We tuned each model with grid search: try many combinations of settings and keep the one that scores best across time-ordered validation folds. The test month was never used for tuning. This mattered most for the boosted models. XGBoost went from a cross-validated PR-AUC of ${cvGain("gb").replace(" to ", " to ")} and LightGBM from ${cvGain("lgbm")}, and on the test month XGBoost's F1 went from ${f2(FPM.gb.test.f1)} to ${f2(gb.test.f1)} and LightGBM's from ${f2(FPM.lgbm.test.f1)} to ${f2(lg.test.f1)}. What helped was making them smaller and giving fraud more weight, not bigger. The other models changed little. Josh will show the final results.`);
  s.addChart(pres.charts.BAR, [{ name: "First pass", labels: ["XGBoost", "LightGBM"], values: [FPM.gb, FPM.lgbm].map(m => +m.cv.mean_pr_auc.toFixed(3)) }, { name: "After tuning", labels: ["XGBoost", "LightGBM"], values: [gb, lg].map(m => +m.cv.mean_pr_auc.toFixed(3)) }],
    { x: 0.7, y: 1.5, w: 6.6, h: 3.8, barDir: "col", chartColors: ["9BC1BC", "E4572E"], showLegend: true, legendPos: "b", legendFontSize: 12, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 13, valAxisMaxVal: 1, catAxisLabelFontSize: 14, valAxisLabelFontSize: 11, valGridLine: { style: "none" }, showTitle: true, title: "Cross-validated PR-AUC", titleFontSize: 14, objectName: "Tuning chart" });
  [["Grid search", "Try many setting combinations, keep the best across time-ordered folds."], ["Smaller, with more fraud weight", `XGBoost: ${gb.params.n_estimators} trees, fraud weight ${gb.params.scale_pos_weight}. Bigger models scored worse.`], ["Test month untouched", "Never used to choose settings or the best model."]].forEach(([h, b], i) => { const y = 1.55 + i * 1.25; card(s, 7.6, y, 5.0, 1.1, "Tuning card " + i);
    text(s, h, { x: 7.85, y: y + 0.1, w: 4.5, h: 0.35, fontSize: 15, bold: true, color: C.accent1 }); text(s, b, { x: 7.85, y: y + 0.45, w: 4.5, h: 0.6, fontSize: 12 }); });
  strip(s, fa.FaChartLine, "Biggest gains:", `XGBoost CV PR-AUC ${cvGain("gb")}, LightGBM ${cvGain("lgbm")}. Linear models and Naive Bayes stayed the same.`, 5.5);

  s = slide("Results", "JOSH", `Here is each model's PR-AUC on the held-out December month. The tree-based models do well: LightGBM has the highest test score at ${f2(lg.test.pr_auc)}, then the decision tree, the random forest and XGBoost, all around ${f2(gb.test.pr_auc)} to ${f2(tr.test.pr_auc)}. The two linear models fail, near zero, because fraud depends on combinations of features that a straight line can't capture. We still call the random forest our best model, because it had the best cross-validated score, ${f2(rf.cv.mean_pr_auc)}, and we chose using validation only, not the test month. It caught ${c.tp} of ${c.tp + c.fn} fraud cases with ${c.fp} false alarms among about ${nrow(c.tn + c.fp)} normal transactions. The history features were the biggest single help: PR-AUC rose from ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}. Logan will close with the takeaways.`);
  s.addChart(pres.charts.BAR, [{ name: "Test PR-AUC", labels: by.map(m => SH_[m.key]), values: by.map(m => +m.test.pr_auc.toFixed(3)) }], Object.assign({ x: 0.7, y: 1.5, w: 7.6, h: 3.9, barDir: "bar", chartColors: ["2B7A78"], showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 12, catAxisOrientation: "maxMin", valAxisMaxVal: 1, showTitle: true, title: "PR-AUC on the held-out December month", titleFontSize: 14, objectName: "Results chart" }, chartBase, { catAxisLabelFontSize: 13 }));
  [[`${c.tp} of ${c.tp + c.fn}`, "fraud cases caught by the random forest"], [String(c.fp), "false alarms among about " + nrow(c.tn + c.fp) + " normal transactions"], [`${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}`, "PR-AUC lift from history features"]].forEach(([n, l], i) => { const y = 1.55 + i * 1.3; card(s, 8.6, y, 4.0, 1.15, "Stat " + i);
    text(s, n, { x: 8.8, y: y + 0.08, w: 3.6, h: 0.55, fontSize: 24, bold: true, color: C.accent1 }); text(s, l, { x: 8.8, y: y + 0.65, w: 3.6, h: 0.45, fontSize: 12 }); });
  strip(s, fa.FaBalanceScale, "Best model:", `random forest (best by cross-validation, ${f2(rf.cv.mean_pr_auc)}). LightGBM has the top test score, but one month with ${c.tp + c.fn} fraud cases is a small sample.`, 5.5);

  s = slide("Takeaways and who did what", "LOGAN", `Thanks, Josh. Four takeaways. Tree-based models work well on this problem and linear models don't. History features helped the most. Tuning rescued the boosted models, and they now match the forest on the test month. And fraud is rare, so how you measure, with PR-AUC and F1, matters as much as which model you pick. The limits: the data is simulated, so the exact scores may not carry over to real spending, and one test month is a small sample. For future work we would try real data with permission. On who did what: Josh built logistic regression, the decision tree, the random forest, extra trees and the feature pipeline. I built XGBoost, LightGBM, the calibrated linear SVM and Naive Bayes, and tuned them. We built the demo app, the decks and the report together, and the code is on GitHub. Thank you, we are happy to take questions.`);
  cards(s, [[fa.FaTree, "Trees win", "Tree-based models do well. Linear models fail."], [fa.FaUserClock, "History helps most", `PR-AUC ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}.`], [fa.FaSlidersH, "Tuning matters", "Boosted models went from behind to level with the forest."], [fa.FaChartLine, "Measure right", "PR-AUC and F1, not accuracy."]], 1.4, 2.75, 4);
  strip(s, fa.FaFlask, "Limits:", "simulated data, one test month. Future work: real data with permission.", 4.3);
  strip(s, fa.FaUsers, "Who did what:", "Josh: logistic regression, tree, forest, extra trees, features. Logan: XGBoost, LightGBM, SVM, Naive Bayes, tuning. Together: app, decks, report, code at github.com/joshmfrancis/FraudLens.", 5.6);

  await Promise.all(pend);
  await pres.writeFile({ fileName: path.join(OUT, "Fraud_Detection_Final_Simple.pptx") });
  await applyTheme(path.join(OUT, "Fraud_Detection_Final_Simple.pptx"), THEME);
  require("fs").writeFileSync(path.join(OUT, "final_simple_notes.txt"), "FINAL PRESENTATION (SIMPLE) - SPEAKER NOTES\n\n" + notes.map(([w, n], i) => `Slide ${i + 1} (${w})\n${n}\n`).join("\n"));
  console.log("done");
})();
