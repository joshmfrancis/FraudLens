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
  pres.title = "Credit Card Fraud Detection - ML Project Intermediate Update";
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
      { text: { text: "Credit Card Fraud Detection  |  ML Project Intermediate Update", options: { x: 0.7, y: 6.95, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
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
  const DR = R.dimred, SVDc = DR.svd_continuous.models, SVDa = DR.svd_all_models.models, g = (a, q) => a.find(m => m.key === q);
  const byTest = [...ms].sort((a, b) => b.test.pr_auc - a.test.pr_auc), byCv = [...ms].sort((a, b) => b.cv.mean_pr_auc - a.cv.mean_pr_auc);
  const nrow = x => x.toLocaleString("en-US");
  // 1
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: SEC });
  s.addText("Fraud Detection: Intermediate Update", { placeholder: "title" });
  s.addText([{ text: "Machine Learning Project", options: { breakLine: true } }, { text: "Joshua Francis and Logan Digilormo" }], { placeholder: "subtitle" });
  [[9.0, 1.5, 3.2, 55, C.accent1], [11.2, 4.5, 1.8, 50, C.accent4], [9.3, 5.2, 1.1, 60, C.accent6], [11.6, 1.7, 0.7, 40, C.accent6]].forEach(([x, y, d, t, c], i) => s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: c, transparency: t }, line: { color: c, transparency: t, width: 0 }, objectName: "Decor " + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.5, w: 0.6, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: "Flagged dot" });
  const n1 = "Hello everyone, I'm Josh, and this is Logan. Since the proposal we have generated the data, built the features, trained all eight models with time-aware cross-validation, and explored the data with dimensionality reduction, so today we are presenting real results along with their limitations. Logan will begin with a brief recap.";
  notes.push(["JOSH", n1]); s.addNotes("JOSH: " + n1);
  // 2
  s = slide("Where we left off", "LOGAN", "Thanks, Josh. In the proposal we set out to detect credit card fraud with classical machine learning. The data is simulated with the public Sparkov generator, so no private data is involved. We planned engineered features and now eight models, judged by F1 and PR-AUC instead of accuracy. Since then we added time-aware cross-validation and dimensionality reduction with SVD and t-SNE. Josh will show how much of the plan is complete.");
  cards(s, [[fa.FaSearch, "The problem", "Flag fraudulent credit card transactions, a small share of all purchases."], [fa.FaDatabase, "The data", "Simulated transactions from the public Sparkov generator on GitHub."], [fa.FaCogs, "The plan", "Eight models, tuned by time-aware cross-validation, plus SVD and t-SNE."]], 1.7, 3.3, 3);
  // 3
  s = slide("Progress against our proposal", "JOSH", `Here is our checklist against the proposal. We generated ${k(D.rows)} transactions for ${D.customers} customers across 2025 and built ${R.n_model_features} model inputs. We validated the models with five-fold, time-aware cross-validation on January to November and kept December as a final test. All eight models are trained and scored with both F1 and PR-AUC. Wherever a model has a loss function it is cross-entropy: logistic regression, XGBoost, and LightGBM minimize log loss, and the tree, forest, and extra trees split on entropy. The linear SVM uses hinge loss and is then calibrated with log loss, and Naive Bayes has no loss at all. We also added dimensionality reduction. The scoring demo and the final report are still ahead. Logan will walk through the data.`);
  [["Generate public data", "Done", `${k(D.rows)} transactions, ${D.customers} customers, 2025`], ["Engineer features", "Done", `${R.n_model_features} inputs; history features use past data only`], ["Cross-validated model selection", "Done", "5 time-aware folds on Jan-Nov; December held out"], ["Train eight models", "Done", "Cross-entropy loss; F1 and PR-AUC"], ["Dimensionality reduction", "Done", "SVD, t-SNE, and models on reduced inputs"], ["Demo and final report", "In progress", "Scoring app built; report in progress"]].forEach(([a, b, c], i) => {
    const y = 1.6 + i * 0.86; card(s, 0.7, y, 11.9, 0.72, "Row " + i);
    text(s, a, { x: 1.0, y, w: 4.2, h: 0.72, fontSize: 17, bold: true, valign: "middle" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: y + 0.18, w: 1.2, h: 0.36, rectRadius: 0.18, fill: { color: b === "Done" ? C.accent1 : C.accent5 }, line: { color: b === "Done" ? C.accent1 : C.accent5, width: 0 }, objectName: "Pill " + i });
    text(s, b, { x: 5.3, y: y + 0.18, w: 1.2, h: 0.36, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, c, { x: 6.8, y, w: 5.6, h: 0.72, fontSize: 14, valign: "middle" }); });
  // 4
  s = slide("Data: generated and validated", "LOGAN", `The data has ${nrow(D.rows)} transactions from ${D.customers} customers, with no repeated rows or missing values. Fraud is ${p1(D.fraud_rate)} of transactions, about ${nrow(D.fraud_rows)} cases, so fraud is rare. A model that always answers "not fraud" would be ${p1(D.dummy_accuracy)} accurate and catch nothing, which is why we do not rely on accuracy. Josh will describe the features we built.`);
  [[nrow(D.rows), "transactions"], [String(D.customers), "customers"], [p1(D.fraud_rate), "of transactions are fraud"]].forEach(([n, c], i) => { const x = 0.7 + i * 3.05; card(s, x, 1.7, 2.75, 3.4, "Stat " + i);
    text(s, n, { x: x + 0.25, y: 2.3, w: 2.3, h: 1.2, fontSize: 40, bold: true, color: C.accent1, valign: "middle" }); text(s, c, { x: x + 0.25, y: 3.6, w: 2.3, h: 1.0, fontSize: 16 }); });
  card(s, 9.85, 1.7, 2.75, 3.4, "Trap card", C.text1); text(s, p1(D.dummy_accuracy), { x: 10.1, y: 2.2, w: 2.3, h: 1.0, fontSize: 36, bold: true, color: C.accent3 });
  text(s, "accuracy of always guessing \"not fraud\". It catches zero fraud.", { x: 10.1, y: 3.4, w: 2.3, h: 1.5, fontSize: 15, color: C.background1 });
  strip(s, fa.FaShieldAlt, "No private data:", "everything is simulated, and the generator is public and reproducible.");
  // 5
  s = slide("Features built so far", "JOSH", `We built ${R.n_model_features} model inputs in four groups. Base features are amount, customer age, and city size, plus fourteen merchant category columns. Time features are hour, weekday, weekend, and night. Distance is the haversine distance from home to the merchant. History features describe each customer's past, such as the amount compared with their average and purchases in the last hour. These use only earlier transactions, so nothing leaks from the future. Logan will explain how we reduced the dimensionality of these inputs.`);
  cards(s, [[fa.FaDatabase, "Base and category", "Amount, age, city size, and 14 category columns."], [fa.FaClock, "Time", "Hour, weekday, weekend flag, and night flag."], [fa.FaMapMarkedAlt, "Distance", "Haversine miles from home to the merchant."], [fa.FaUserClock, "History", "9 features: gaps, speed, amount vs average, counts."]], 1.7, 3.5, 4);
  strip(s, fa.FaShieldAlt, "No future leakage:", "history features only use a customer's earlier transactions.", 5.5);
  // 6
  s = slide("Dimensionality reduction: SVD", "LOGAN", `With ${R.n_model_features} inputs that overlap, we applied singular value decomposition, or SVD, which rewrites the data as new directions ordered by how much of it they capture. We scale each column but do not center it. Centering first would turn SVD into PCA, which is a special case of SVD, and it would need ${DR.pca_k95} components for 95 percent. Uncentered SVD needs ${DR.k95} components, and the first two capture ${Math.round(DR.c12_energy * 100)} percent. The first component is dominated by overall level, mainly the customer's typical amount, and the second by amount compared with that typical amount. In the two-dimensional view, fraud overlaps normal activity heavily, so no simple projection separates it. Josh will show a nonlinear view and the effect of reduced inputs on the models.`);
  DC.svd(XC, s);
  // 7
  const rfc = g(SVDc, "rf"), rfa = g(SVDa, "rf"), lgc = g(SVDc, "lgbm");
  s = slide("t-SNE and SVD in the models", "JOSH", `To look for structure that SVD cannot show, we used t-SNE, a nonlinear method, on a balanced sample of 3,000 fraud and 3,000 normal transactions. Fraud forms local clusters: on average ${Math.round(DR.tsne.neighbor_purity * 100)} percent of a fraud point's ten nearest neighbors are also fraud. We then trained all eight models on reduced inputs. SVD on only the ${DR.svd_continuous.n_continuous} continuous features, with flags and categories kept, helps the models that work well on the full data: the random forest scores ${f2(rfc.pr_auc_svd)} versus ${f2(rfc.pr_auc_full)}, and LightGBM ${f2(lgc.pr_auc_svd)} versus ${f2(lgc.pr_auc_full)}. Others lose more, such as extra trees and XGBoost. SVD on all ${R.n_model_features} features drops every model to near zero, ${f3(rfa.pr_auc_svd)} for the forest, probably because the fraud signal sits in flags and categories that the rotation mixes. We have not tested that explanation. Logan will explain how we validated the models.`);
  DC.tsne(XC, s);
  // 8
  const sdRf = g(ms, "rf"), hi = [...ms].sort((a, b) => b.cv.std_pr_auc - a.cv.std_pr_auc)[0];
  s = slide("Time-aware cross-validation", "LOGAN", `We validated with time-aware cross-validation. The January to November development period is cut into six chunks. In each of five folds, the models train on the earlier chunks and validate on the next one, so they never see the future. We chose each model's settings by average PR-AUC across the folds and its decision threshold from the pooled validation predictions, and we record F1 in every fold as well. Each model was then refit on the whole development period and tested once on December. The folds also show instability: the random forest averages ${f2(sdRf.cv.mean_pr_auc)} with a spread of ${f2(sdRf.cv.std_pr_auc)}, while the ${hi.name.toLowerCase()} has a spread of ${f2(hi.cv.std_pr_auc)}. Josh will present the early results.`);
  DC.cv(XC, s);
  // 9
  const tp = byTest[0], g2 = g(ms, "gb"), lg = g(ms, "lgbm");
  s = slide("Early model results", "JOSH", `Here are all eight models on the held-out December test, beside their cross-validated scores. The two linear models, logistic regression and the linear SVM, fail: their test PR-AUC is ${f3(g(ms, "logreg").test.pr_auc)} and ${f3(g(ms, "svm").test.pr_auc)}, because the fraud pattern is non-linear. Naive Bayes is stable but weak at ${f2(g(ms, "nb").test.pr_auc)}. The tree-based models do the real work. The random forest has the best cross-validated PR-AUC at ${f2(best.cv.mean_pr_auc)} and the best test F1 at ${f2(best.test.f1)}, with a test PR-AUC of ${f2(best.test.pr_auc)}. The decision tree matches it on the test month, ${f2(g(ms, "tree").test.pr_auc)}, but its folds swing from ${f2(Math.min(...g(ms, "tree").cv.folds_pr_auc))} to ${f2(Math.max(...g(ms, "tree").cv.folds_pr_auc))}. XGBoost and LightGBM have low F1, ${f2(g2.test.f1)} and ${f2(lg.test.f1)}, because their thresholds were too strict after refitting, so their PR-AUC of ${f2(g2.test.pr_auc)} and ${f2(lg.test.pr_auc)} is the fairer figure. These are first-pass results with small tuning grids. Logan will cover the limitations.`);
  DC.table(XC, s, 1.55);
  strip(s, fa.FaBalanceScale, "Read PR-AUC first:", "it does not depend on a threshold. F1 depends on the threshold chosen in validation, which does not always transfer to the test month.", 5.7);
  // 10
  s = slide("Limitations", "LOGAN", `We want to be clear about the limits. The data is simulated, so results may not transfer to real spending. Distance from home had no signal: its single-feature score is ${f2(E.single_feature_roc_auc.dist_home_mi)}, a coin flip. Fraud also drifts, from ${p1(sp.dev.fraud_rate)} of transactions in January to November to ${p1(sp.test.fraud_rate)} in the test month, and cross-validation scores vary by fold. Finally, tuning is limited to small grids and thresholds do not always transfer, so the numbers should improve. Josh will cover our scope and what has changed.`);
  cards(s, [[fa.FaFlask, "Simulated data", "Results may not transfer to real-world spending."], [fa.FaMapMarkedAlt, "No distance signal", `Single-feature score ${f2(E.single_feature_roc_auc.dist_home_mi)}; it did not help in our first ablation.`], [fa.FaChartLine, "Fraud rate drifts", `${p1(sp.dev.fraud_rate)} in Jan-Nov versus ${p1(sp.test.fraud_rate)} in the test month.`], [fa.FaCogs, "Unstable folds", `Small tuning grids; ${hi.name.toLowerCase()} CV PR-AUC varies by ±${f2(hi.cv.std_pr_auc)}.`]], 1.7, 3.3, 4);
  strip(s, fa.FaBalanceScale, "Thresholds do not always transfer:", `LightGBM reaches a PR-AUC of ${f2(lg.test.pr_auc)} but an F1 of only ${f2(lg.test.f1)}.`, 5.3);
  // 11
  s = slide("Scope and changes since proposal", "JOSH", "Our title and topic are unchanged: detecting credit card fraud with machine learning. We want to state the changes since the proposal clearly. We now use eight models instead of two, a time-aware split with five-fold cross-validation, and the public Sparkov generator for data. We also added dimensionality reduction with SVD and t-SNE, and we report both F1 and PR-AUC. Finally, the distance finding shifts our emphasis toward amount, time, and customer history. Logan will close with next steps and who is doing what.");
  cards(s, [[fa.FaCheckCircle, "Topic and title", "Unchanged: credit card fraud detection."], [fa.FaSortAmountDown, "Changes since proposal", "Eight models, time-aware cross-validation, SVD and t-SNE, F1 and PR-AUC, Sparkov data."], [fa.FaRoute, "Shift in emphasis", "Amount, time, and customer history lead; distance is reported honestly."]], 1.7, 3.3, 3);
  strip(s, fa.FaCheckCircle, "Scope:", "same problem and data source, with broader methods and stronger validation.", 5.3);
  // 12
  s = slide("Next steps and who does what", "LOGAN", "For next steps, Josh owns logistic regression, the decision tree, the random forest, and extra trees, along with the feature pipeline and the ablation study. I own XGBoost, LightGBM, the calibrated linear SVM, and Naive Bayes, including deeper tuning and threshold choice. Together we will finish the scoring demo, the final deck, the report, and the GitHub repository. The final presentation is November 24th and 26th, and the report is due December 6th. Thank you, and we are happy to take questions.");
  person(s, 0, "Josh", fa.FaChartLine, JM, "Feature pipeline and the ablation study", 1.55, 3.9); person(s, 1, "Logan", fa.FaTree, LM, "Deeper tuning and threshold choice", 1.55, 3.9);
  strip(s, fa.FaCheckCircle, "Together:", "scoring demo, final deck (Nov 22), report (Dec 6), and the GitHub repo.", 5.65);
  await Promise.all(pend);
  await pres.writeFile({ fileName: path.join(OUT, "Fraud_Detection_Intermediate.pptx") });
  await applyTheme(path.join(OUT, "Fraud_Detection_Intermediate.pptx"), THEME);
  require("fs").writeFileSync(path.join(OUT, "intermediate_notes.json"), JSON.stringify(notes));
  console.log("done");
})();
