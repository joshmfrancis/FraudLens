const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/mnt/skills/public/pptx/scripts/apply_theme.js");
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

  const R = require("/home/claude/fraud-detection-ml/reports/results.json");
  const D = R.dataset, M = Object.fromEntries(R.models.map(m => [m.key, m])), E = R.eda;
  const p1 = x => (x * 100).toFixed(1) + "%", f2 = x => x.toFixed(2), f3 = x => x.toFixed(3), k = x => Math.round(x / 1000) + "K";
  const best = M[R.best_model], notes = [];
  const slide = (t, who, note) => { const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC }); s.addText(t, { placeholder: "title" }); notes.push([who, note]); s.addNotes(who + ": " + note); return s; };
  const cards = (s, items, y, h, n) => items.forEach(([Ic, hd, b], i) => { const w = (11.9 - (n - 1) * 0.3) / n, x = 0.7 + i * (w + 0.3);
    card(s, x, y, w, h, "Card " + (i + 1)); ci(s, Ic, x + 0.3, y + 0.3, 0.7, hd);
    text(s, hd, { x: x + 0.3, y: y + 1.2, w: w - 0.6, h: 0.45, fontSize: 19, bold: true }); text(s, b, { x: x + 0.3, y: y + 1.75, w: w - 0.6, h: h - 1.9, fontSize: 15 }); });
  const strip = (s, Ic, lead, rest, y = 5.5) => { card(s, 0.7, y, 11.9, 1.2, "Strip"); ci(s, Ic, 1.0, y + 0.2, 0.8, "Strip", C.accent3, "#17252A");
    text(s, [{ text: lead + " ", options: { bold: true } }, { text: rest }], { x: 2.1, y: y + 0.2, w: 10.2, h: 0.8, fontSize: 16, valign: "middle" }); };
  const pend = []; const ci = (...a) => pend.push(circleIcon(...a));
  const DC = require('/home/claude/decks_common.js'); const XC = { pres, C, card, text, ci, strip, R, fa };
  const DEMO = require("/home/claude/fraud-detection-ml/reports/demo_examples.json"), A = R.ablation, I = R.importance, sp = D.split;
  const rf = best, c = rf.test.confusion, ab = Object.fromEntries(A.map(a => [a.name[0], a]));
  const FN = { amt: "Amount", is_night: "Night hours", hour: "Hour of day", amt_ratio: "Amount vs average", amt_mean_past: "Typical amount", secs_since_prev: "Gap since last purchase", amt_z: "Amount z-score" };
  const chartBase = { catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valGridLine: { style: "none" }, showLegend: false };
  const person = (s, i, nm, Ic, a, b, ex, y = 1.7, h = 3.5) => { const x = 0.7 + i * 6.1; card(s, x, y, 5.8, h, "Person " + nm); ci(s, Ic, x + 0.35, y + 0.3, 0.8, nm);
    text(s, nm, { x: x + 1.5, y: y + 0.4, w: 3.5, h: 0.6, fontSize: 26, bold: true }); text(s, [{ text: "Models: ", options: { bold: true } }, { text: a + " and " + b, options: { breakLine: true } }, { text: "Also: ", options: { bold: true } }, { text: ex }], { x: x + 0.35, y: y + 1.5, w: 5.1, h: 1.8, fontSize: 17, paraSpaceAfter: 8 }); };
  // 1
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: SEC });
  s.addText("Fraud Detection: Final Results", { placeholder: "title" });
  s.addText([{ text: "Machine Learning Project", options: { breakLine: true } }, { text: "Joshua Francis and Logan Digilormo" }], { placeholder: "subtitle" });
  [[9.0, 1.5, 3.2, 55, C.accent1], [11.2, 4.5, 1.8, 50, C.accent4], [9.3, 5.2, 1.1, 60, C.accent6], [11.6, 1.7, 0.7, 40, C.accent6]].forEach(([x, y, d, t, cl], i) => s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cl, transparency: t }, line: { color: cl, transparency: t, width: 0 }, objectName: "Decor " + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.5, w: 0.6, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: "Flagged dot" });
  const n1 = "Hello everyone, I'm Josh, and this is Logan. This is our final presentation on detecting credit card fraud with machine learning. We'll cover our data and features, dimensionality reduction with PCA and t-SNE, time-aware cross-validation, the final results, and a live demo of a scoring app we built. Logan will begin by recalling the problem."; notes.push(["JOSH", n1]); s.addNotes("JOSH: " + n1);
  // 2
  s = slide("The problem and our goal", "LOGAN", `Thanks, Josh. Our goal is to flag fraudulent credit card transactions from the amount, category, time, and a customer's own history. The challenge is that fraud is rare: ${p1(D.fraud_rate)} of our ${D.rows.toLocaleString("en-US")} simulated transactions, or roughly one in a hundred, as in this picture. A model therefore has to find a few needles in a large haystack, and plain accuracy would be misleading. Josh will describe the data and features.`);
  [["Goal", "Predict whether a transaction is fraud."], ["Challenge", `Fraud is only ${p1(D.fraud_rate)} of transactions.`], ["Our yardstick", "Precision, recall, F1, and PR-AUC, never accuracy alone."]].forEach(([h, b], i) => { text(s, h, { x: 0.7, y: 1.75 + i * 1.65, w: 6.4, h: 0.4, fontSize: 20, bold: true, color: C.accent1 }); text(s, b, { x: 0.7, y: 2.25 + i * 1.65, w: 6.4, h: 1.0, fontSize: 17 }); });
  for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) { const fl = r === 5 && q === 3; s.addShape(pres.shapes.OVAL, { x: 8.0 + q * 0.45, y: 1.75 + r * 0.45, w: 0.34, h: 0.34, fill: { color: fl ? C.accent2 : C.accent6 }, line: { color: fl ? C.accent2 : C.accent6, width: 0 }, objectName: fl ? "Fraud dot" : "Dot " + (r * 10 + q) }); }
  text(s, "Illustration: about 1 fraud in every 100 transactions", { x: 8.0, y: 6.3, w: 4.7, h: 0.35, fontSize: 12, color: C.accent5 });
  // 3
  s = slide("Data and features", "JOSH", `We generated ${D.rows.toLocaleString("en-US")} transactions for ${D.customers} customers across 2025 with the public Sparkov tool, so no private data is involved. From the raw columns we built ${R.n_model_features} model inputs in four groups: base details, time, distance from home, and customer history. The history features, such as the amount compared with a customer's average, use only that customer's earlier purchases, so nothing leaks from the future. Logan will show how we reduced the dimensionality of these inputs.`);
  cards(s, [[fa.FaDatabase, "Base and category", "Amount, age, city size, and 14 category columns."], [fa.FaClock, "Time", "Hour, weekday, weekend, and night flags."], [fa.FaMapMarkedAlt, "Distance", "Haversine miles from home to the merchant."], [fa.FaUserClock, "History", "Gaps, speed, amount vs average, recent counts."]], 1.7, 3.3, 4);
  strip(s, fa.FaShieldAlt, "Dataset:", `${D.rows.toLocaleString("en-US")} simulated transactions, ${D.customers} customers, ${p1(D.fraud_rate)} fraud.`, 5.4);
  // 4
  s = slide("Dimensionality reduction: PCA", "LOGAN", `Our ${R.n_model_features} inputs overlap a lot, so we applied principal component analysis, or PCA, which rotates the data into new directions ordered by how much variation they carry. It takes ${R.dimred.k95} of the ${R.n_model_features} components to keep 95 percent of the variance, and the first two keep ${Math.round(R.dimred.pc12_variance * 100)} percent. The first component mostly reflects recent activity, such as purchases in the last day, and the second mostly reflects amount. In the two-dimensional view, fraud overlaps normal activity heavily, so no simple projection separates it. Josh will show a nonlinear view and what happens when models use the reduced inputs.`);
  DC.pca(XC, s);
  // 5
  s = slide("t-SNE and PCA in the models", "JOSH", `To look for structure that PCA can't show, we used t-SNE, a nonlinear method, on a balanced sample of 3,000 fraud and 3,000 normal transactions. Fraud forms local clusters: on average ${Math.round(R.dimred.tsne.neighbor_purity * 100)} percent of a fraud point's ten nearest neighbors are also fraud. We then trained the models on reduced inputs. Applying PCA to only the ${R.dimred.pca_continuous.n_continuous} continuous features keeps most of the performance, with the random forest at ${f2(R.dimred.pca_continuous.models.find(m => m.key === "rf").pr_auc_pca)} versus ${f2(M.rf.test.pr_auc)}. Applying PCA to all ${R.n_model_features} features collapses it to ${f2(R.dimred.pca_all_models.models.find(m => m.key === "rf").pr_auc_pca)}, because the fraud signal sits in flags and categories that the rotation scrambles. We did not test that explanation separately. Logan will explain how we validated the models.`);
  DC.tsne(XC, s);
  // 6
  s = slide("Methods and cross-validation", "LOGAN", `We used time-aware cross-validation. The January to November development period is cut into six chunks, and in each of five folds the models train on the earlier chunks and validate on the next one, so they never see the future. We picked each model's settings by average PR-AUC across the folds, and chose its decision threshold from the pooled validation predictions. Then each model was refit on the whole development period and tested once on December. All four models optimize cross-entropy: logistic regression and gradient boosting minimize log loss directly, and the tree and forest split on entropy. The folds also show how unstable some models are: the random forest averages ${M.rf.cv.mean_pr_auc.toFixed(2)} with a spread of ${M.rf.cv.std_pr_auc.toFixed(2)}, while gradient boosting's spread is ${M.gb.cv.std_pr_auc.toFixed(2)}. Josh will compare the results.`);
  DC.cv(XC, s);
  // 7
  s = slide("Model comparison", "JOSH", `Here are all four models on the test month, next to their cross-validated scores. The random forest is best on both: a test PR-AUC of ${f2(M.rf.test.pr_auc)}, an F1 of ${f2(M.rf.test.f1)}, and a cross-validated PR-AUC of ${f2(M.rf.cv.mean_pr_auc)} with a spread of ${f2(M.rf.cv.std_pr_auc)}. The decision tree reaches ${f2(M.tree.test.pr_auc)}, and gradient boosting ${f2(M.gb.test.pr_auc)}, although its F1 is only ${f2(M.gb.test.f1)} because the threshold chosen in cross-validation was too strict for the refit model, so PR-AUC is the fairer comparison. Logistic regression fails, with a PR-AUC of ${f3(M.logreg.test.pr_auc)}, because fraud depends on combinations of features that a straight-line model cannot express. Logan will look closer at the best model.`);
  const ms = ["logreg", "tree", "rf", "gb"].map(q => M[q]);
  s.addChart(pres.charts.BAR, [["Test PR-AUC", m => m.test.pr_auc], ["Test F1", m => m.test.f1], ["CV PR-AUC (mean)", m => m.cv.mean_pr_auc]].map(([nm, g]) => ({ name: nm, labels: ["Logistic reg.", "Decision tree", "Random forest", "Gradient boosting"], values: ms.map(m => +g(m).toFixed(3)) })), Object.assign({ x: 0.7, y: 1.6, w: 8.2, h: 4.9, barDir: "col", chartColors: ["2B7A78", "E4572E", "5C6B73"], showLegend: true, legendPos: "b", legendFontSize: 13, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 11, valAxisMaxVal: 1, objectName: "Model chart" }, { catAxisLabelFontSize: 13, valAxisLabelFontSize: 12, valGridLine: { style: "none" } }));
  card(s, 9.3, 1.6, 3.3, 4.9, "Best card", C.text1); text(s, f2(best.test.pr_auc), { x: 9.6, y: 2.2, w: 2.7, h: 1.2, fontSize: 60, bold: true, color: C.accent3 }); text(s, `PR-AUC for the ${best.name.toLowerCase()}, with precision ${f2(best.test.precision)} and recall ${f2(best.test.recall)}.`, { x: 9.6, y: 3.7, w: 2.7, h: 2.4, fontSize: 16, color: C.background1 });
  // 6
  s = slide("Best model in detail", "LOGAN", `On the test month, the random forest caught ${c.tp} of ${c.tp + c.fn} fraud cases and raised ${c.fp} false alarms among about ${(c.tn + c.fp).toLocaleString("en-US")} normal transactions. That's a precision of ${f2(rf.test.precision)} and recall of ${f2(rf.test.recall)} at a threshold of ${f2(rf.threshold)}. The threshold matters a lot: at the default of 0.5, its F1 would drop to ${f2(rf.test_at_05 ? rf.test_at_05.f1 : rf["test_at_0.5"].f1)}. The curve shows the trade-off between catching more fraud and raising more false alarms. Josh will explain what drives these predictions.`);
  [[c.tp, "Fraud caught", 0], [c.fp, "False alarms", 1], [c.fn, "Fraud missed", 1], [c.tn, "Normal, left alone", 0]].forEach(([n, l, bad], i) => { const x = 0.7 + (i % 2) * 2.75, y = 1.6 + Math.floor(i / 2) * 2.0; card(s, x, y, 2.55, 1.8, "Tile " + i); text(s, n.toLocaleString("en-US"), { x: x + 0.2, y: y + 0.2, w: 2.15, h: 0.9, fontSize: 36, bold: true, color: bad ? C.accent2 : C.accent1, align: "center", valign: "middle" }); text(s, l, { x: x + 0.2, y: y + 1.15, w: 2.15, h: 0.5, fontSize: 14, align: "center" }); });
  s.addChart(pres.charts.SCATTER, [{ name: "Recall", values: rf.pr_curve.recall }, { name: "Precision", values: rf.pr_curve.precision }], { x: 6.4, y: 1.6, w: 6.2, h: 3.8, chartColors: ["2B7A78"], lineSize: 2, lineDataSymbol: "none", showLegend: false, showCatAxisTitle: true, catAxisTitle: "Recall", showValAxisTitle: true, valAxisTitle: "Precision", catAxisTitleFontSize: 12, valAxisTitleFontSize: 12, catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valAxisMinVal: 0, valAxisMaxVal: 1, catAxisMinVal: 0, catAxisMaxVal: 1, objectName: "PR curve" });
  strip(s, fa.FaBalanceScale, "Trade-off:", "the tuned threshold balances false alarms against missed fraud.", 5.6);
  // 7
  const top = I.slice(0, 7);
  s = slide("What drives fraud", "JOSH", `This chart shows which features the random forest relies on most, measured by how much performance drops when we shuffle each one. Amount is the clear leader, followed by the night flag and the hour of day. Amount compared to the customer's own average also ranks high, which is one of our history features. Distance from home does not appear, which matches what we saw in the data. Logan will test whether the feature groups really help.`);
  s.addChart(pres.charts.BAR, [{ name: "Importance", labels: top.map(i => FN[i.feature] || i.feature), values: top.map(i => +i.value.toFixed(3)) }], Object.assign({ x: 0.7, y: 1.6, w: 11.9, h: 4.9, barDir: "bar", chartColors: ["2B7A78"], showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 12, catAxisOrientation: "maxMin", objectName: "Importance chart" }, chartBase, { catAxisLabelFontSize: 14 }));
  // 8
  s = slide("Do our features help?", "LOGAN", `We tested this with an ablation, retraining the random forest on different feature groups and scoring each on the test month. A base model with amount, time, and category scores a PR-AUC of ${f2(ab.A.pr_auc)}. Adding the history features lifts it to ${f2(ab.C.pr_auc)}, a large gain. Adding distance does not help: ${f2(ab.B.pr_auc)}. Removing distance and speed from the full set changes nothing meaningful, ${f2(ab.E.pr_auc)} versus ${f2(ab.D.pr_auc)}. So the history features earned their place, while distance did not in this data. Josh will show the demo.`);
  s.addChart(pres.charts.BAR, [{ name: "PR-AUC", labels: ["A: base", "B: + distance", "C: + history", "D: all", "E: no distance"], values: A.map(a => +a.pr_auc.toFixed(3)) }], Object.assign({ x: 0.7, y: 1.6, w: 11.9, h: 3.8, barDir: "col", chartColors: ["2B7A78"], showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 13, valAxisMaxVal: 1, objectName: "Ablation chart" }, chartBase, { catAxisLabelFontSize: 14 }));
  strip(s, fa.FaUserClock, "History helps:", `PR-AUC rises from ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}; distance adds nothing here.`, 5.6);
  // 9
  s = slide("Live demo", "JOSH", `We built a small web app that scores a transaction with all four models. A coffee near home scores ${Math.round(DEMO[0].score * 100)} out of 100 and looks normal. An 890 dollar online purchase at two thirty in the morning scores ${Math.round(DEMO[2].score * 100)} and is flagged as likely fraud, driven mostly by amount and time of day. A large evening purchase near home scores ${Math.round(DEMO[3].score * 100)}, which the app labels worth a look. The app also shows what moved each score. I will now run it live. Logan will cover the limitations.`);
  DEMO.forEach((d, i) => { const x = 0.7 + i * 3.033, bad = d.verdict === "Likely fraud", mid = d.verdict === "Worth a look", cc = bad ? C.accent2 : mid ? C.accent5 : C.accent1; card(s, x, 1.7, 2.8, 3.5, "Demo " + i); text(s, String(Math.round(d.score * 100)), { x: x + 0.25, y: 1.95, w: 2.3, h: 1.1, fontSize: 54, bold: true, color: cc });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.25, y: 3.15, w: 1.7, h: 0.38, rectRadius: 0.19, fill: { color: cc }, line: { color: cc, width: 0 }, objectName: "Verdict " + i }); text(s, d.verdict, { x: x + 0.25, y: 3.15, w: 1.7, h: 0.38, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, d.name, { x: x + 0.25, y: 3.75, w: 2.3, h: 0.5, fontSize: 17, bold: true }); text(s, "Biggest mover: " + d.driver.toLowerCase(), { x: x + 0.25, y: 4.35, w: 2.3, h: 0.7, fontSize: 14 }); });
  strip(s, fa.FaPlayCircle, "Run it live:", "start the server, then open the app in a browser and score two scenarios.", 5.5);
  // 10
  s = slide("Limitations and lessons learned", "LOGAN", `We want to be clear about the limits and lessons. The data is simulated, so results may not transfer to real spending. Distance from home carried no signal in this generator. Fraud also drifts over time: ${p1(sp.dev.fraud_rate)} of January to November transactions were fraud, but only ${p1(sp.test.fraud_rate)} in the test month, and cross-validation scores varied across folds. The main lessons were that accuracy is a trap, that thresholds do not always transfer, and that features must use only the past. Josh will summarize the conclusions.`);
  cards(s, [[fa.FaFlask, "Simulated data", "Results may not transfer to real-world spending."], [fa.FaMapMarkedAlt, "No distance signal", "Fraud is no farther from home in this generated data."], [fa.FaChartLine, "Fraud drifts", `${p1(sp.dev.fraud_rate)} in Jan-Nov versus ${p1(sp.test.fraud_rate)} in the test month.`], [fa.FaBalanceScale, "Thresholds matter", `Random forest F1: ${f2(rf.test.f1)} tuned, ${f2(rf["test_at_0.5"].f1)} at 0.5.`]], 1.7, 3.3, 4);
  strip(s, fa.FaShieldAlt, "Lessons:", `accuracy alone misleads (${p1(D.dummy_accuracy)} for guessing "not fraud"), and history features must use only the past.`, 5.4);
  // 11
  s = slide("Conclusions and future work", "JOSH", `We have three main findings. First, the random forest was our best model, with a test F1 of ${f2(rf.test.f1)}, a test PR-AUC of ${f2(rf.test.pr_auc)}, and the most stable cross-validation scores. Second, customer-history features mattered most, lifting PR-AUC from ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}. Third, dimensionality reduction helped us understand the data but not the models: PCA on the continuous features kept most of the performance, and PCA on everything did not. Distance from home, our original idea, did not help in this simulated data. For future work we would try real data with permission, cost-based thresholds, and generator settings where travel matters. Logan will close.`);
  cards(s, [[fa.FaTree, "Best model", `Random forest: F1 ${f2(rf.test.f1)}, PR-AUC ${f2(rf.test.pr_auc)}.`], [fa.FaUserClock, "History matters", `PR-AUC ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)} with history features.`], [fa.FaSortAmountDown, "Reduction has a cost", `PCA on continuous inputs: forest ${f2(R.dimred.pca_continuous.models.find(q => q.key === "rf").pr_auc_pca)} vs ${f2(rf.test.pr_auc)}.`]], 1.7, 3.2, 3);
  strip(s, fa.FaSearch, "Future work:", "real data with permission, cost-based thresholds, and generator settings where travel matters.", 5.3);
  // 12
  s = slide("Thank you and questions", "LOGAN", "Thanks, Josh. To recap who did what: Josh built the logistic regression and decision tree, the feature pipeline, and the ablation. I built the random forest and gradient boosting and handled tuning and thresholds. We built the demo, the decks, and the report together, and all the code is in our GitHub repository. Thank you, and we are happy to take questions.");
  person(s, 0, "Josh", fa.FaChartLine, "Logistic regression", "Decision tree", "Feature pipeline and the ablation study", 1.7, 3.3); person(s, 1, "Logan", fa.FaTree, "Random forest", "Gradient boosting", "Tuning and threshold choice", 1.7, 3.3);
  strip(s, fa.FaCheckCircle, "Together:", "scoring demo, decks, final report, and the GitHub repository.", 5.3);
  await Promise.all(pend);
  await pres.writeFile({ fileName: "/home/claude/Fraud_Detection_Final.pptx" });
  await applyTheme("/home/claude/Fraud_Detection_Final.pptx", THEME);
  require("fs").writeFileSync("/home/claude/final_notes.json", JSON.stringify(notes));
  console.log("done");
})();
