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
  const slide = (t, who, note) => { const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC }); s.addText(t, { placeholder: "title" }); notes.push([who, note]); s.addNotes(who + ": " + note); return s; };
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
  // 1
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: SEC });
  s.addText("Fraud Detection: Final Results", { placeholder: "title" });
  s.addText([{ text: "Machine Learning Project", options: { breakLine: true } }, { text: "Joshua Francis and Logan Digilormo" }], { placeholder: "subtitle" });
  [[9.0, 1.5, 3.2, 55, C.accent1], [11.2, 4.5, 1.8, 50, C.accent4], [9.3, 5.2, 1.1, 60, C.accent6], [11.6, 1.7, 0.7, 40, C.accent6]].forEach(([x, y, d, t, cl], i) => s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cl, transparency: t }, line: { color: cl, transparency: t, width: 0 }, objectName: "Decor " + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.5, w: 0.6, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: "Flagged dot" });
  const n1 = "Hello everyone, I'm Josh, and this is Logan. This is our final presentation on detecting credit card fraud with machine learning. We'll cover our data and features, dimensionality reduction with SVD and t-SNE, our eight models and time-aware cross-validation, the final results, and a live demo of a scoring app we built. Logan will begin by recalling the problem.";
  notes.push(["JOSH", n1]); s.addNotes("JOSH: " + n1);
  // 2
  s = slide("The problem and our goal", "LOGAN", `Thanks, Josh. Our goal is to flag fraudulent credit card transactions from the amount, category, time, and a customer's own history. The challenge is that fraud is rare: ${p1(D.fraud_rate)} of our ${nrow(D.rows)} simulated transactions, or roughly one in a hundred, as in this picture. A model therefore has to find a few needles in a large haystack, and plain accuracy would be misleading. We judge every model by F1 and PR-AUC. Josh will describe the data and features.`);
  [["Goal", "Predict whether a transaction is fraud."], ["Challenge", `Fraud is only ${p1(D.fraud_rate)} of transactions.`], ["Our yardstick", "F1 and PR-AUC, never accuracy alone."]].forEach(([h, b], i) => { text(s, h, { x: 0.7, y: 1.75 + i * 1.65, w: 6.4, h: 0.4, fontSize: 20, bold: true, color: C.accent1 }); text(s, b, { x: 0.7, y: 2.25 + i * 1.65, w: 6.4, h: 1.0, fontSize: 17 }); });
  for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) { const fl = r === 5 && q === 3; s.addShape(pres.shapes.OVAL, { x: 8.0 + q * 0.45, y: 1.75 + r * 0.45, w: 0.34, h: 0.34, fill: { color: fl ? C.accent2 : C.accent6 }, line: { color: fl ? C.accent2 : C.accent6, width: 0 }, objectName: fl ? "Fraud dot" : "Dot " + (r * 10 + q) }); }
  text(s, "Illustration: about 1 fraud in every 100 transactions", { x: 8.0, y: 6.3, w: 4.7, h: 0.35, fontSize: 12, color: C.accent5 });
  // 3
  s = slide("Data and features", "JOSH", `We generated ${nrow(D.rows)} transactions for ${D.customers} customers across 2025 with the public Sparkov tool, so no private data is involved. From the raw columns we built ${R.n_model_features} model inputs in four groups: base details, time, distance from home, and customer history. The history features, such as the amount compared with a customer's average, use only that customer's earlier purchases, so nothing leaks from the future. Logan will first check whether the simulated data is believable.`);
  cards(s, [[fa.FaDatabase, "Base and category", "Amount, age, city size, and 14 category columns."], [fa.FaClock, "Time", "Hour, weekday, weekend, and night flags."], [fa.FaMapMarkedAlt, "Distance", "Haversine miles from home to the merchant."], [fa.FaUserClock, "History", "Gaps, speed, amount vs average, recent counts."]], 1.7, 3.3, 4);
  strip(s, fa.FaShieldAlt, "Dataset:", `${nrow(D.rows)} simulated transactions, ${D.customers} customers, ${p1(D.fraud_rate)} fraud.`, 5.4);

  // 4 (new): is the simulated data believable?
  s = slide("Is the simulated data believable?", "LOGAN", `Before trusting any result, we asked whether the simulated data is believable, so we read how the Sparkov generator creates fraud. Every customer gets one short burst of fraud, about a day long, drawn from a separate fraud profile instead of the normal one. In that profile a customer makes many more purchases, spends more on online shopping, groceries and other online purchases, spends larger amounts, shops mostly at night, and does not travel. We then checked that our generated data matches that design. ${V.customers_with_fraud} of ${V.customers} customers have a fraud burst, averaging ${V.fraud_rows_per_customer.mean.toFixed(1)} fraud transactions. The median fraud amount is ${Math.round(V.median_amt.fraud)} dollars against ${Math.round(V.median_amt.normal)} for normal purchases, and ${pct0(V.night_share.fraud)} of fraud happens at night against ${pct0(V.night_share.normal)} of normal purchases. Distance from home is the same for both, which is why distance carried no signal. So the generator does what it documents. What it cannot tell us is whether real fraud looks like this. The fraud rate is a setting, one burst per customer, and real card fraud is typically far rarer than one percent, so we use this data to compare methods fairly, not to predict real-world accuracy. It also explains our drift: fraud per day stays flat all year, but Sparkov roughly doubles normal volume in the holiday weeks, so the December fraud rate falls to ${p1(sp.test.fraud_rate)}. Josh will explain how the history features work and why they cannot leak.`);
  { const H = t => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: "17252A" }, fontSize: 13 } });
    const rows = [[H("What we measured"), H("Normal"), H("Fraud")]];
    const topN = Object.entries(V.category_share).sort((a, b) => b[1].normal - a[1].normal)[0], topF = Object.entries(V.category_share).sort((a, b) => b[1].fraud - a[1].fraud)[0];
    const data = [["Fraud per customer", "none", `1 burst, ${V.fraud_rows_per_customer.mean.toFixed(1)} purchases`], ["Median amount", "$" + V.median_amt.normal.toFixed(0), "$" + V.median_amt.fraud.toFixed(0)],
      ["Share at night (10pm to 6am)", pct0(V.night_share.normal), pct0(V.night_share.fraud)], ["Most common category", `${topN[0].replace("_", " ")} (${pct0(topN[1].normal)})`, `${topF[0].replace("_", " ")} (${pct0(topF[1].fraud)})`],
      ["Median distance from home", V.distance_mi.normal_median.toFixed(0) + " mi", V.distance_mi.fraud_median.toFixed(0) + " mi"]];
    data.forEach((r, i) => { const fill = { color: i % 2 ? "FFFFFF" : "E3F4F2" }, o = { fill, fontSize: 13, color: "17252A" }; rows.push([{ text: r[0], options: Object.assign({ bold: true }, o) }, { text: r[1], options: o }, { text: r[2], options: o }]); });
    s.addTable(rows, { x: 0.7, y: 1.55, w: 6.5, colW: [2.6, 1.7, 2.2], rowH: 0.5, border: { type: "none" }, valign: "middle", margin: [0, 0.1, 0, 0.1], objectName: "Sparkov table" });
    text(s, `Measured on our ${nrow(D.rows)} generated transactions.`, { x: 0.7, y: 4.65, w: 6.5, h: 0.3, fontSize: 12, color: C.accent5 }); }
  text(s, "Share of transactions by hour of day", { x: 7.5, y: 1.5, w: 5.1, h: 0.35, fontSize: 15, bold: true });
  s.addChart(pres.charts.LINE, [{ name: "Fraud", labels: V.hour_share.fraud.map((_, i) => String(i)), values: V.hour_share.fraud.map(v => +v.toFixed(4)) }, { name: "Normal", labels: V.hour_share.normal.map((_, i) => String(i)), values: V.hour_share.normal.map(v => +v.toFixed(4)) }],
    { x: 7.5, y: 1.9, w: 5.1, h: 3.0, chartColors: ["E4572E", "2B7A78"], lineSize: 2, lineDataSymbol: "none", showLegend: true, legendPos: "b", legendFontSize: 11, catAxisLabelFontSize: 10, valAxisLabelFontSize: 11, valAxisLabelFormatCode: "0%", valGridLine: { style: "none" }, objectName: "Hour chart" });
  strip(s, fa.FaSearch, "The generator does what it documents.", "The fraud rate is a setting (one burst per customer), so we use this data to compare methods, not to predict real-world accuracy.", 5.2);
  // 5 (new): history features and leakage
  s = slide("History features, and why they cannot leak", "JOSH", `Here is what the history group in our features means, and why it cannot leak. For every purchase we describe the customer's own past: how big this purchase is compared with their typical amount so far, how many purchases they made in the last hour and the last day, how long since their last purchase, and how fast they would have had to travel. In this example, a customer's earlier purchases average about 43 dollars, and then an 890 dollar purchase arrives, so the amount is about twenty times their normal. The rule is that a feature may only use purchases that happened strictly before the one being scored. We enforce that in three ways. First, our running averages are running totals minus the current row, so a purchase never counts toward its own average. Second, the counts for the last hour and day only look at earlier timestamps. Third, the validation folds and the test month are in time order too, so no row is ever scored with knowledge of its future. If we let the future in, our scores would look better than any real system could achieve. Logan will show how we reduced the dimensionality of these inputs.`);
  { const past = [["$30", "10:05 pm"], ["$55", "11:10 pm"], ["$45", "11:25 pm"], ["$42", "11:35 pm"]];
    text(s, "Only the customer's past is used", { x: 0.7, y: 1.5, w: 6.5, h: 0.35, fontSize: 15, bold: true, color: C.accent1 }); text(s, "Scoring this purchase", { x: 7.5, y: 1.5, w: 1.9, h: 0.35, fontSize: 15, bold: true, color: C.accent2 }); text(s, "Never used", { x: 9.7, y: 1.5, w: 2.9, h: 0.35, fontSize: 15, bold: true, color: C.accent5 });
    past.forEach(([a, t], i) => { const x = 0.7 + i * 1.65; card(s, x, 1.95, 1.5, 0.95, "Past " + i, C.background2); text(s, a, { x, y: 2.0, w: 1.5, h: 0.5, fontSize: 20, bold: true, align: "center", valign: "middle" }); text(s, t, { x, y: 2.5, w: 1.5, h: 0.3, fontSize: 12, align: "center", color: C.accent5 }); });
    card(s, 7.5, 1.95, 1.9, 0.95, "Now", C.accent2); text(s, "$890", { x: 7.5, y: 2.0, w: 1.9, h: 0.5, fontSize: 22, bold: true, align: "center", valign: "middle", color: C.background1 }); text(s, "11:50 pm", { x: 7.5, y: 2.5, w: 1.9, h: 0.3, fontSize: 12, align: "center", color: C.background1 });
    [0, 1].forEach(i => { const x = 9.7 + i * 1.5; s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.95, w: 1.3, h: 0.95, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.accent5, width: 1.25, dashType: "dash" }, objectName: "Future " + i }); text(s, "later", { x, y: 1.95, w: 1.3, h: 0.95, fontSize: 14, align: "center", valign: "middle", color: C.accent5 }); });
    text(s, "Features computed for the $890 purchase (illustrative numbers)", { x: 0.7, y: 3.05, w: 8, h: 0.3, fontSize: 12, color: C.accent5 });
    [["$43", "Typical amount so far"], ["21x", "This purchase vs typical"], ["3", "Purchases in the last hour"], ["15 min", "Gap since last purchase"]].forEach(([a, l], i) => { const w = 2.8, x = 0.7 + i * (w + 0.233); card(s, x, 3.4, w, 1.0, "Feature " + i); text(s, a, { x: x + 0.2, y: 3.45, w: 1.3, h: 0.9, fontSize: 24, bold: true, valign: "middle", color: C.accent1 }); text(s, l, { x: x + 1.45, y: 3.45, w: w - 1.55, h: 0.9, fontSize: 13, valign: "middle" }); }); }
  [["Strictly earlier", "Running totals subtract the current row (cumulative sum minus amount), so a purchase never counts toward its own average."], ["Look back only", "Counts for the last hour and day use earlier timestamps only. A customer's first purchase has no history, so it is filled with zero."], ["Time-ordered splits", "Validation folds and the test month are in time order too, so no row is scored with knowledge of its future."]].forEach(([h, b], i) => { const w = 3.77, x = 0.7 + i * (w + 0.3); card(s, x, 4.65, w, 1.95, "Guard " + i); text(s, h, { x: x + 0.25, y: 4.8, w: w - 0.5, h: 0.4, fontSize: 17, bold: true, color: C.accent1 }); text(s, b, { x: x + 0.25, y: 5.25, w: w - 0.5, h: 1.25, fontSize: 13 }); });
  // 6 (old 4)
  s = slide("Dimensionality reduction: SVD", "LOGAN", `Our ${R.n_model_features} inputs overlap a lot, so we applied singular value decomposition, or SVD, which rewrites the data as new directions ordered by how much of it they capture. We scale each column but do not center it. Centering first would turn SVD into PCA, which is a special case, and PCA needs ${DR.pca_k95} components for 95 percent. Uncentered SVD needs ${DR.k95} of the ${R.n_model_features}, and the first two capture ${Math.round(DR.c12_energy * 100)} percent. The first component is dominated by overall level, mainly the customer's typical amount, and the second by amount compared with that typical amount. In the two-dimensional view, fraud overlaps normal activity heavily, so no simple projection separates it. Josh will show a nonlinear view and what happens when models use the reduced inputs.`);
  DC.svd(XC, s);
  // 5
  s = slide("t-SNE and SVD in the models", "JOSH", `To look for structure that SVD can't show, we used t-SNE, a nonlinear method, on a balanced sample of 3,000 fraud and 3,000 normal transactions. Fraud forms local clusters: on average ${Math.round(DR.tsne.neighbor_purity * 100)} percent of a fraud point's ten nearest neighbors are also fraud. We then trained all eight models on reduced inputs. Applying SVD to only the ${DR.svd_continuous.n_continuous} continuous features, and keeping the flags and categories, keeps most of the performance for the models that work well on the full data: the random forest scores ${f2(rfc.pr_auc_svd)} versus ${f2(rfc.pr_auc_full)}, and LightGBM ${f2(lgc.pr_auc_svd)} versus ${f2(lgc.pr_auc_full)}. Others lose more, such as extra trees and XGBoost. Applying SVD to all ${R.n_model_features} features drops every model to near zero, ${f3(rfa.pr_auc_svd)} for the forest, probably because the fraud signal sits in flags and categories that the rotation scrambles. We did not test that explanation separately. Logan will explain our eight models.`);
  DC.tsne(XC, s);
  // 6
  s = slide("Eight models and their loss functions", "LOGAN", "We compared eight classical models, four from each of us. Josh's are logistic regression, a decision tree, a random forest, and extra trees. Mine are XGBoost, LightGBM, a linear support vector machine, and Naive Bayes. Wherever a model has a loss function, it is cross-entropy. Logistic regression, XGBoost, and LightGBM minimize log loss directly, and the tree, forest, and extra trees choose splits by entropy. The linear SVM trains on hinge loss, which is a margin loss, so we calibrate its scores with log loss to get probabilities. Naive Bayes has no loss: it is fit by maximum likelihood. Josh will explain how we handle the class imbalance.");
  { const H = t => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: "17252A" }, fontSize: 13 } });
    const rows = [[H("Model"), H("Owner"), H("How it learns"), H("Loss or objective")]];
    const how = { logreg: "Weighted sum of features", tree: "One tree of yes/no splits", rf: "Many bootstrapped trees vote", et: "Trees with random split points", gb: "Trees fixing earlier errors", lgbm: "Faster boosting, leaf-wise trees", svm: "Maximum-margin line, then calibrated", nb: "Bayes' rule, independent features" };
    ms.forEach((m, i) => { const fill = { color: i % 2 ? "FFFFFF" : "E3F4F2" }, o = { fill, fontSize: 12, color: "17252A" }; rows.push([{ text: m.name, options: Object.assign({ bold: true }, o) }, { text: DC.OWNER[m.key], options: o }, { text: how[m.key], options: o }, { text: m.loss, options: o }]); });
    s.addTable(rows, { x: 0.7, y: 1.55, w: 11.9, colW: [2.9, 0.9, 3.4, 4.7], rowH: 0.43, border: { type: "none" }, valign: "middle", margin: [0, 0.1, 0, 0.1], objectName: "Models table" }); }
  strip(s, fa.FaBalanceScale, "Class weights:", "every model treats a missed fraud as costlier than a false alarm (Naive Bayes has no class weight).", 5.75);

  // 9 (new): class imbalance
  const spwVals = k => [...new Set(CVN.models[k].grid.map(r => r.params.scale_pos_weight))].sort((a, b) => a - b).join(", "), balW = Math.round((sp.dev.rows - sp.dev.fraud) / sp.dev.fraud), wTxt = k => { const v = (g(ms, k).params || {}).scale_pos_weight; return v === undefined ? "9" : String(v); };
  s = slide("Handling the class imbalance", "JOSH", `Fraud is about one in a hundred transactions, so a model that always answers not fraud would be ${p1(D.dummy_accuracy)} accurate and catch nothing. We keep the data imbalanced and make the model care about the rare cases, in four steps. First, class weights: a missed fraud costs the model much more than a false alarm. Logistic regression, the decision tree, the forest, extra trees and the SVM use balanced class weights, which makes each fraud example count about ${balW} times more. For XGBoost and LightGBM the fraud weight is a setting we tuned, trying ${spwVals("gb")} for XGBoost and ${spwVals("lgbm")} for LightGBM, and cross-validation picked ${wTxt("gb")} and ${wTxt("lgbm")}. Naive Bayes has no weighting. Second, we judge models by PR-AUC and F1, not accuracy. Third, each model's fraud cutoff is picked in cross-validation to maximize F1, rather than left at 0.5. Fourth, validation and test data keep the real fraud rate, and we only change how the model trains. One caveat: weighting makes scores good for ranking, but they are not true probabilities. We did not try resampling such as SMOTE, which is future work. Logan will explain how we validated the models.`);
  card(s, 0.7, 1.6, 3.9, 3.95, "Imbalance card"); text(s, "1 in 100", { x: 0.95, y: 1.85, w: 3.4, h: 1.0, fontSize: 48, bold: true, color: C.accent2, align: "center", valign: "middle" });
  text(s, "transactions are fraud", { x: 0.95, y: 2.85, w: 3.4, h: 0.4, fontSize: 16, align: "center" });
  text(s, `Always answering "not fraud" is ${p1(D.dummy_accuracy)} accurate and catches nothing.`, { x: 0.95, y: 3.6, w: 3.4, h: 1.5, fontSize: 17, align: "center", bold: true });
  [[fa.FaWeightHanging, "1. Class weights", `A missed fraud costs about ${balW}x more for five models. XGBoost and LightGBM weights are tuned.`], [fa.FaChartLine, "2. Right metrics", "PR-AUC and F1, never accuracy alone."],
   [fa.FaSlidersH, "3. Tuned threshold", "Each cutoff maximizes F1 in cross-validation, not the default 0.5."], [fa.FaBalanceScale, "4. Honest evaluation", "Validation and test keep the real fraud rate. Only training changes."]].forEach(([Ic, h, b], i) => {
    const x = 4.9 + (i % 2) * 3.95, y = 1.6 + Math.floor(i / 2) * 2.05; card(s, x, y, 3.75, 1.9, "Step " + i); ci(s, Ic, x + 0.25, y + 0.25, 0.6, h);
    text(s, h, { x: x + 1.0, y: y + 0.25, w: 2.6, h: 0.6, fontSize: 17, bold: true, valign: "middle" }); text(s, b, { x: x + 0.25, y: y + 1.0, w: 3.3, h: 0.85, fontSize: 13 }); });
  strip(s, fa.FaInfoCircle, "No resampling:", "we did not use SMOTE or undersampling. Weighted scores rank well, but they are not true probabilities.", 5.75);
  // 10 (old 7)
  s = slide("Time-aware cross-validation", "LOGAN", `We used time-aware cross-validation. The January to November development period is cut into six chunks, and in each of five folds the models train on the earlier chunks and validate on the next one, so they never see the future. We picked each model's settings by average PR-AUC across the folds, and chose its decision threshold from the pooled validation predictions, and we report F1 per fold as well. Then each model was refit on the whole development period and tested once on December. The folds also show how unstable some models are: the random forest averages ${f2(rf.cv.mean_pr_auc)} with a spread of ${f2(rf.cv.std_pr_auc)}, while the ${hi.name.toLowerCase()} has a spread of ${f2(hi.cv.std_pr_auc)}. Josh will show how we tuned each model's settings.`);
  DC.cv(XC, s);

  // 11 (new): hyperparameter tuning
  const ABBR = { scale_pos_weight: "fraud weight", max_depth: "depth", min_samples_leaf: "min leaf", min_child_weight: "min child", min_child_samples: "min child", num_leaves: "leaves", colsample_bytree: "colsample", subsample: "subsample", n_estimators: "trees", var_smoothing: "smoothing", alpha: "alpha", C: "C" };
  const ab2 = k => ABBR[k] || k, fmtP = p => Object.entries(p).map(([k, v]) => `${ab2(k)} ${v}`).join(", ");
  const combos = key => CVN.models[key].grid.length, searched = key => Object.keys(CVN.models[key].grid[0].params).map(ab2).join(", ");
  const gains = ms.map(m => ({ m, d: m.cv.mean_pr_auc - FPM[m.key].cv.mean_pr_auc, old: FPM[m.key].cv.mean_pr_auc })).sort((a, b) => b.d - a.d);
  s = slide("Hyperparameter tuning", "JOSH", `We tuned every model's settings with grid search on the same time-aware folds. A grid search tries every combination from a short list of settings and keeps the one with the best average PR-AUC across the five folds. Our first pass tried two to four combinations per model. For the final version we widened the grids to between ${Math.min(...ms.map(m => combos(m.key)))} and ${Math.max(...ms.map(m => combos(m.key)))} combinations per model, adding the fraud weight, number of trees, and sampling settings for the boosted models. Because the boosted models' best values kept landing at the edge of the grid, we searched them in three rounds, each finer grid centered on the previous winner. Cross-validation chose every winner. The test month was never used for tuning. The table shows what we searched, how many combinations we tried, and what won. The biggest cross-validated gains were ${gains[0].m.name} from ${f2(gains[0].old)} to ${f2(gains[0].m.cv.mean_pr_auc)} and ${gains[1].m.name} from ${f2(gains[1].old)} to ${f2(gains[1].m.cv.mean_pr_auc)}. Logan will compare the results.`);
  { const H = t => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: "17252A" }, fontSize: 12 } });
    const rows = [[H("Model"), H("Settings searched"), H("Tried"), H("Winning settings"), H("CV PR-AUC, first pass to final")]];
    ms.forEach((m, i) => { const fill = { color: i % 2 ? "FFFFFF" : "E3F4F2" }, o = { fill, fontSize: 11, color: "17252A" };
      rows.push([{ text: m.name, options: Object.assign({ bold: true }, o) }, { text: searched(m.key), options: o }, { text: String(combos(m.key)), options: Object.assign({ align: "center" }, o) }, { text: fmtP(m.params), options: o },
        { text: `${f2(FPM[m.key].cv.mean_pr_auc)} to ${f2(m.cv.mean_pr_auc)}`, options: Object.assign({ align: "center" }, o) }]); });
    s.addTable(rows, { x: 0.7, y: 1.5, w: 11.9, colW: [1.9, 3.1, 0.7, 4.3, 1.9], rowH: 0.5, border: { type: "none" }, valign: "middle", margin: [0, 0.08, 0, 0.08], objectName: "Tuning table" }); }
  text(s, "Winners are chosen by mean PR-AUC across the five time-aware folds. The test month is never used for tuning.", { x: 0.7, y: 6.25, w: 11.9, h: 0.4, fontSize: 14, color: C.accent5 });
  // 12 (old 8)
  s = slide("Model comparison", "LOGAN", `Here are all eight models on the test month, next to their cross-validated scores. The random forest has the best cross-validated PR-AUC, ${f2(rf.cv.mean_pr_auc)} with a spread of ${f2(rf.cv.std_pr_auc)}, and on test it reaches a PR-AUC of ${f2(rf.test.pr_auc)} and an F1 of ${f2(rf.test.f1)}. After tuning, the boosted models have caught up: LightGBM has the highest test PR-AUC, ${f2(lg.test.pr_auc)}, with an F1 of ${f2(lg.test.f1)}, and XGBoost reaches ${f2(gb.test.pr_auc)} and ${f2(gb.test.f1)}. We still call the forest our best model because we chose by cross-validation and did not switch after seeing the test month, and the gaps on a single month with ${c.tp + c.fn} fraud cases are small. The decision tree ties the forest on test at ${f2(tr.test.pr_auc)}, but its validation folds swing from ${f2(Math.min(...tr.cv.folds_pr_auc))} to ${f2(Math.max(...tr.cv.folds_pr_auc))}, so we trust it less. Both linear models fail, with PR-AUC of ${f3(lr.test.pr_auc)} for logistic regression and ${f3(sv.test.pr_auc)} for the linear SVM, because fraud depends on combinations of features that a straight line cannot express. Naive Bayes is stable but weak at ${f2(nb.test.pr_auc)}. Josh will explain what made the boosted models better.`);
  DC.table(XC, s, 1.55);
  strip(s, fa.FaBalanceScale, "Read PR-AUC first:", "it needs no threshold. Bold marks the best cross-validated and best test PR-AUC. Selection used cross-validation only.", 5.7);


  // 13 (new): what made the boosted models better
  { const bigP = BPJ[0], tunP = BPJ[1], A31 = "all 31 inputs", NOC = "without city size and age", gp = gb.params, lp = lg.params;
    s = slide("What made the boosted models better", "JOSH", `Here is what we learned about XGBoost and LightGBM, which we expected to do best. In our first pass they trailed the forest, with cross-validated PR-AUC of ${f2(FPM.gb.cv.mean_pr_auc)} and ${f2(FPM.lgbm.cv.mean_pr_auc)} against ${f2(rf.cv.mean_pr_auc)}. Tuning changed that. XGBoost rose to ${f2(gb.cv.mean_pr_auc)} and LightGBM to ${f2(lg.cv.mean_pr_auc)} in cross-validation, and on the test month to ${f2(gb.test.pr_auc)} and ${f2(lg.test.pr_auc)}. What helped was making the boosted models smaller and more regularized, not bigger: only ${gp.n_estimators} trees, each built from half the rows and half the columns, with a heavier fraud weight. On the validation folds, a bigger XGBoost with 400 trees and depth 10 scored ${f2(bigP[A31])} against ${f2(tunP[A31])} for the tuned one, so extra capacity overfits. We also tested whether city size and age, which identify individual customers, let boosting memorize customers. Removing them lifted the oversized model from ${f2(bigP[A31])} to ${f2(bigP[NOC])}, but barely changed the tuned model, ${f2(tunP[A31])} to ${f2(tunP[NOC])}, so memorizing customers is only part of the story. Our reading is that boosting builds trees one after another and can chase noise in a small fraud class that drifts over time, while the forest averages many independent trees. We did not prove that. The forest still leads in cross-validation, ${f2(rf.cv.mean_pr_auc)} against ${f2(gb.cv.mean_pr_auc)} and ${f2(lg.cv.mean_pr_auc)}. Logan will show the precision-recall curves for all eight models.`);
    text(s, "PR-AUC before and after tuning", { x: 0.7, y: 1.5, w: 6.4, h: 0.4, fontSize: 15, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "CV, first pass", labels: ["XGBoost", "LightGBM"], values: [FPM.gb, FPM.lgbm].map(m => +m.cv.mean_pr_auc.toFixed(3)) }, { name: "CV, tuned", labels: ["XGBoost", "LightGBM"], values: [gb, lg].map(m => +m.cv.mean_pr_auc.toFixed(3)) },
      { name: "Test, first pass", labels: ["XGBoost", "LightGBM"], values: [FPM.gb, FPM.lgbm].map(m => +m.test.pr_auc.toFixed(3)) }, { name: "Test, tuned", labels: ["XGBoost", "LightGBM"], values: [gb, lg].map(m => +m.test.pr_auc.toFixed(3)) }],
      { x: 0.7, y: 1.95, w: 6.4, h: 3.5, barDir: "col", chartColors: ["9BC1BC", "2B7A78", "F4A58A", "E4572E"], showLegend: true, legendPos: "b", legendFontSize: 11, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 11, valAxisMaxVal: 1, catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, valGridLine: { style: "none" }, objectName: "Boosted tuning chart" });
    [["Smaller, not bigger", `Tuned XGBoost: ${gp.n_estimators} trees, half the rows and columns each. A bigger one (400 trees, depth 10) scores ${f2(bigP[A31])} vs ${f2(tunP[A31])} on validation folds.`],
     ["Heavier fraud weight", `XGBoost's best weight is ${gp.scale_pos_weight} (first pass: 9). LightGBM's is ${lp.scale_pos_weight}.`],
     ["Customer identity is only part of it", `Dropping city size and age lifts the oversized model (${f2(bigP[A31])} to ${f2(bigP[NOC])}) but not the tuned one (${f2(tunP[A31])} to ${f2(tunP[NOC])}).`]].forEach(([h, b], i) => { const y = 1.55 + i * 1.4; card(s, 7.4, y, 5.2, 1.28, "Finding " + i);
      text(s, h, { x: 7.65, y: y + 0.1, w: 4.7, h: 0.35, fontSize: 15, bold: true, color: C.accent1 }); text(s, b, { x: 7.65, y: y + 0.48, w: 4.7, h: 0.78, fontSize: 12 }); });
    strip(s, fa.FaBalanceScale, "The forest still leads in cross-validation:", `${f2(rf.cv.mean_pr_auc)} vs ${f2(gb.cv.mean_pr_auc)} (XGBoost) and ${f2(lg.cv.mean_pr_auc)} (LightGBM). On the test month the three are close.`, 5.75); }
  // 14 (new): precision-recall curves for all models
  { const COL = { rf: "2B7A78", tree: "F2B134", gb: "E4572E", lgbm: "7B5EA7", et: "3C7DD9", nb: "5BAA4B", logreg: "8C6D46", svm: "17252A" };
    const byPr = [...ms].sort((a, b) => b.test.pr_auc - a.test.pr_auc), rAt = (m, q) => { let r = 0; m.pr_curve.recall.forEach((x, i) => { if (m.pr_curve.precision[i] >= q) r = x; }); return r; };
    s = slide("Precision-recall curves for all eight models", "LOGAN", `This is the curve behind PR-AUC. For every possible cutoff, it plots precision, the share of flagged transactions that are really fraud, against recall, the share of all fraud we catch. Moving right means catching more fraud, usually at the price of more false alarms. PR-AUC is the area under each curve, so higher and further right is better. The gray line along the bottom is a model that guesses at random: its precision is just the fraud rate in the test month, ${p1(sp.test.fraud_rate)}. The random forest keeps its precision above 50 percent until about ${pct0(rAt(rf, 0.5))} recall, and the decision tree is close behind. ${g(ms, "lgbm").name} and ${g(ms, "gb").name} are in the middle. Logistic regression and the linear SVM hug the bottom, barely above random guessing, which matches their near-zero PR-AUC. Josh will look closer at the best model.`);
    const x = ms[0].pr_curve.recall, series = [{ name: "Recall", values: x }].concat(byPr.map(m => ({ name: SH_[m.key], values: m.pr_curve.precision }))).concat([{ name: "Random guess", values: x.map(() => +sp.test.fraud_rate.toFixed(4)) }]);
    s.addChart(pres.charts.SCATTER, series, { x: 0.7, y: 1.5, w: 8.4, h: 4.1, chartColors: byPr.map(m => COL[m.key]).concat(["9AA5AB"]), lineSize: 2, lineDataSymbol: "none", showLegend: true, legendPos: "b", legendFontSize: 11,
      showCatAxisTitle: true, catAxisTitle: "Recall (share of fraud caught)", showValAxisTitle: true, valAxisTitle: "Precision (share of flags that are fraud)", catAxisTitleFontSize: 12, valAxisTitleFontSize: 12, catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
      valAxisMinVal: 0, valAxisMaxVal: 1, catAxisMinVal: 0, catAxisMaxVal: 1, valGridLine: { style: "none" }, catGridLine: { style: "none" }, objectName: "PR curves" });
    const H = t => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: "17252A" }, fontSize: 12 } }), rows = [[H("Model"), H("Test PR-AUC")]];
    byPr.forEach((m, i) => { const fill = { color: i % 2 ? "FFFFFF" : "E3F4F2" }, o = { fill, fontSize: 12, color: "17252A" }; rows.push([{ text: SH_[m.key], options: Object.assign({ bold: true }, o) }, { text: f3(m.test.pr_auc), options: Object.assign({ align: "center" }, o) }]); });
    s.addTable(rows, { x: 9.4, y: 1.6, w: 3.2, colW: [2.0, 1.2], rowH: 0.4, border: { type: "none" }, valign: "middle", margin: [0, 0.08, 0, 0.08], objectName: "PR-AUC table" });
    strip(s, fa.FaChartLine, "Higher and further right is better.", `PR-AUC is the area under each curve. The gray line along the bottom is random guessing at the test fraud rate (${p1(sp.test.fraud_rate)}).`, 5.75); }
  // 15 (old 9)
  s = slide("Best model in detail", "JOSH", `On the test month, the random forest caught ${c.tp} of ${c.tp + c.fn} fraud cases and raised ${c.fp} false alarms among about ${nrow(c.tn + c.fp)} normal transactions. That's a precision of ${f2(rf.test.precision)} and recall of ${f2(rf.test.recall)} at a threshold of ${f2(rf.threshold)}. The threshold matters a lot: at the default of 0.5, its F1 would drop to ${f2(rf["test_at_0.5"].f1)}. The curve shows the trade-off between catching more fraud and raising more false alarms. Logan will explain what drives these predictions.`);
  [[c.tp, "Fraud caught", 0], [c.fp, "False alarms", 1], [c.fn, "Fraud missed", 1], [c.tn, "Normal, left alone", 0]].forEach(([n, l, bad], i) => { const x = 0.7 + (i % 2) * 2.75, y = 1.6 + Math.floor(i / 2) * 2.0; card(s, x, y, 2.55, 1.8, "Tile " + i); text(s, nrow(n), { x: x + 0.2, y: y + 0.2, w: 2.15, h: 0.9, fontSize: 36, bold: true, color: bad ? C.accent2 : C.accent1, align: "center", valign: "middle" }); text(s, l, { x: x + 0.2, y: y + 1.15, w: 2.15, h: 0.5, fontSize: 14, align: "center" }); });
  s.addChart(pres.charts.SCATTER, [{ name: "Recall", values: rf.pr_curve.recall }, { name: "Precision", values: rf.pr_curve.precision }], { x: 6.4, y: 1.6, w: 6.2, h: 3.8, chartColors: ["2B7A78"], lineSize: 2, lineDataSymbol: "none", showLegend: false, showCatAxisTitle: true, catAxisTitle: "Recall", showValAxisTitle: true, valAxisTitle: "Precision", catAxisTitleFontSize: 12, valAxisTitleFontSize: 12, catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valAxisMinVal: 0, valAxisMaxVal: 1, catAxisMinVal: 0, catAxisMaxVal: 1, objectName: "PR curve" });
  strip(s, fa.FaBalanceScale, "Trade-off:", "the tuned threshold balances false alarms against missed fraud.", 5.6);
  // 10
  const top = I.slice(0, 7), hasDist = top.some(i => i.feature === "dist_home_mi");
  s = slide("What drives fraud", "LOGAN", `This chart shows which features the random forest relies on most, measured by how much performance drops when we shuffle each one. ${FN[top[0].feature]} is the clear leader, followed by ${FN[top[1].feature].toLowerCase()} and ${FN[top[2].feature].toLowerCase()}. ${FN[top[3].feature]} also ranks high, which is one of our history features. Distance from home ${hasDist ? "appears but is not a leading feature" : "does not appear"}, which matches what we saw in the data. Josh will test whether the feature groups really help.`);
  s.addChart(pres.charts.BAR, [{ name: "Importance", labels: top.map(i => FN[i.feature] || i.feature), values: top.map(i => +i.value.toFixed(3)) }], Object.assign({ x: 0.7, y: 1.6, w: 11.9, h: 4.9, barDir: "bar", chartColors: ["2B7A78"], showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 12, catAxisOrientation: "maxMin", objectName: "Importance chart" }, chartBase, { catAxisLabelFontSize: 14 }));
  // 11
  s = slide("Do our features help?", "JOSH", `We tested this with an ablation, retraining the random forest on different feature groups and scoring each on the test month. A base model with amount, time, and category scores a PR-AUC of ${f2(ab.A.pr_auc)}. Adding the history features lifts it to ${f2(ab.C.pr_auc)}, a large gain. Adding distance does not help: ${f2(ab.B.pr_auc)}. Removing distance and speed from the full set changes nothing meaningful, ${f2(ab.E.pr_auc)} versus ${f2(ab.D.pr_auc)}. So the history features earned their place, while distance did not in this data. Logan will show the demo.`);
  s.addChart(pres.charts.BAR, [{ name: "PR-AUC", labels: ["A: base", "B: + distance", "C: + history", "D: all", "E: no distance"], values: A.map(a => +a.pr_auc.toFixed(3)) }], Object.assign({ x: 0.7, y: 1.6, w: 11.9, h: 3.8, barDir: "col", chartColors: ["2B7A78"], showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 13, valAxisMaxVal: 1, objectName: "Ablation chart" }, chartBase, { catAxisLabelFontSize: 14 }));
  strip(s, fa.FaUserClock, "History helps:", `PR-AUC rises from ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}; distance adds nothing here.`, 5.6);
  // 12
  s = slide("Live demo", "LOGAN", `We built a small web app that scores a transaction with all eight models. A coffee near home scores ${Math.round(DEMO[0].score * 100)} out of 100 with the random forest and looks normal. An 890 dollar online purchase at two thirty in the morning scores ${Math.round(DEMO[2].score * 100)} and is flagged as likely fraud, driven mostly by amount and time of day. A large evening purchase near home scores ${Math.round(DEMO[3].score * 100)}, which the app labels worth a look. The app also shows what moved each score and lets you switch models. I will now run it live. Josh will cover the limitations and conclusions.`);
  DEMO.forEach((d, i) => { const x = 0.7 + i * 3.033, bad = d.verdict === "Likely fraud", mid = d.verdict === "Worth a look", cc = bad ? C.accent2 : mid ? C.accent5 : C.accent1; card(s, x, 1.7, 2.8, 3.5, "Demo " + i); text(s, String(Math.round(d.score * 100)), { x: x + 0.25, y: 1.95, w: 2.3, h: 1.1, fontSize: 54, bold: true, color: cc });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.25, y: 3.15, w: 1.7, h: 0.38, rectRadius: 0.19, fill: { color: cc }, line: { color: cc, width: 0 }, objectName: "Verdict " + i }); text(s, d.verdict, { x: x + 0.25, y: 3.15, w: 1.7, h: 0.38, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, d.name, { x: x + 0.25, y: 3.75, w: 2.3, h: 0.5, fontSize: 17, bold: true }); text(s, "Biggest mover: " + d.driver.toLowerCase(), { x: x + 0.25, y: 4.35, w: 2.3, h: 0.7, fontSize: 14 }); });
  strip(s, fa.FaPlayCircle, "Run it live:", "start the server, then open the app in a browser and score two scenarios, switching between models.", 5.5);
  // 13
  s = slide("Limitations and conclusions", "JOSH", `We have four main findings. First, the random forest was our best model, with the best cross-validated PR-AUC, ${f2(rf.cv.mean_pr_auc)}, a test F1 of ${f2(rf.test.f1)}, and a test PR-AUC of ${f2(rf.test.pr_auc)}. After tuning, XGBoost and LightGBM came close on the test month, so the top tree models are hard to separate. Second, customer-history features mattered most, lifting PR-AUC from ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)}. Third, both linear models failed, so the non-linear tree-based models are what this problem needs. Fourth, dimensionality reduction helped us understand the data but not the models: SVD on the continuous features kept most of the performance for the forest and LightGBM, and SVD on everything did not. There are limits. The data is simulated, so results may not transfer to real spending. Distance from home, our original idea, carried no signal in this generator. Fraud also drifts, from ${p1(sp.dev.fraud_rate)} of January to November transactions to ${p1(sp.test.fraud_rate)} in the test month, and the shift makes a fixed threshold harder to choose. The fraud rate drop is a generator artifact: fraud per day is flat while normal volume jumps in the holiday weeks. For future work we would try real data with permission, cost-based thresholds, and generator settings where travel matters. Logan will close with who did what.`);
  cards(s, [[fa.FaTree, "Best model", `Random forest: F1 ${f2(rf.test.f1)}, PR-AUC ${f2(rf.test.pr_auc)}.`], [fa.FaUserClock, "History matters", `PR-AUC ${f2(ab.A.pr_auc)} to ${f2(ab.C.pr_auc)} with history features.`], [fa.FaChartLine, "Linear models fail", `Test PR-AUC ${f3(lr.test.pr_auc)} (logistic) and ${f3(sv.test.pr_auc)} (SVM).`], [fa.FaSortAmountDown, "SVD has a cost", `SVD on continuous inputs: forest ${f2(rfc.pr_auc_svd)} vs ${f2(rfc.pr_auc_full)}.`]], 1.6, 3.3, 4);
  strip(s, fa.FaFlask, "Limits:", `simulated data, no distance signal, fraud drifts (${p1(sp.dev.fraud_rate)} to ${p1(sp.test.fraud_rate)}), and one test month is a small sample. Future work: real data with permission, cost-based thresholds.`, 5.2);
  // 14
  s = slide("Who did what, and questions", "LOGAN", "Thanks, Josh. To recap who did what: Josh built logistic regression, the decision tree, the random forest, and extra trees, plus the feature pipeline and the ablation. I built XGBoost, LightGBM, the calibrated linear SVM, and Naive Bayes, and handled tuning and thresholds for them. We built the demo, the decks, and the report together, and all the code is in our GitHub repository. Thank you, and we are happy to take questions.");
  person(s, 0, "Josh", fa.FaChartLine, JM, "Feature pipeline and the ablation study", 1.55, 3.9); person(s, 1, "Logan", fa.FaTree, LM, "Tuning and threshold choice for his models", 1.55, 3.9);
  strip(s, fa.FaCheckCircle, "Together:", "scoring demo, decks, final report, and the code at github.com/joshmfrancis/FraudLens.", 5.65);
  await Promise.all(pend);
  await pres.writeFile({ fileName: path.join(OUT, "Fraud_Detection_Final.pptx") });
  await applyTheme(path.join(OUT, "Fraud_Detection_Final.pptx"), THEME);
  require("fs").writeFileSync(path.join(OUT, "final_notes.json"), JSON.stringify(notes));
  console.log("done");
})();
