// Shared slide bodies for the SVD, t-SNE, cross-validation and results-table slides (used by the intermediate and final decks).
const path = require("path");
const FIG = path.join(__dirname, "..", "reports", "figures") + path.sep;
const sd = d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const base = { catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valGridLine: { style: "none" } };
const SH = { logreg: "Logistic reg.", tree: "Decision tree", rf: "Random forest", et: "Extra trees", gb: "XGBoost", lgbm: "LightGBM", svm: "Linear SVM", nb: "Naive Bayes" };
const OWNER = { logreg: "Josh", tree: "Josh", rf: "Josh", et: "Josh", gb: "Logan", lgbm: "Logan", svm: "Logan", nb: "Logan" };
const f2 = v => v.toFixed(2);
module.exports = {
  SH, OWNER,
  svd(x, s) { const { pres, text, strip, R, fa } = x, dr = R.dimred;
    text(s, "Share of energy captured by each SVD component", { x: 0.7, y: 1.5, w: 6.0, h: 0.4, fontSize: 15, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "Energy", labels: dr.energy.slice(0, 12).map((_, i) => "C" + (i + 1)), values: dr.energy.slice(0, 12) }],
      Object.assign({ x: 0.7, y: 1.95, w: 6.0, h: 3.5, barDir: "col", chartColors: ["2B7A78"], showLegend: false, valAxisLabelFormatCode: "0%", objectName: "SVD energy chart" }, base));
    text(s, "First two components (60,000 sampled transactions)", { x: 7.2, y: 1.5, w: 5.4, h: 0.4, fontSize: 15, bold: true });
    s.addImage({ path: FIG + "svd_2d.png", x: 7.2, y: 1.95, w: 4.9, h: 3.48, altText: "SVD projection of normal and fraud transactions", objectName: "SVD scatter" });
    strip(s, fa.FaSortAmountDown, `${dr.k95} of ${dr.n_features} components keep 95% of the energy.`, `The first two keep ${Math.round(dr.c12_energy * 100)}%. PCA, which is SVD after centering, needs ${dr.pca_k95} for the same 95%.`, 5.65); },
  tsne(x, s) { const { pres, text, strip, R, fa } = x, dr = R.dimred, sc = dr.svd_continuous, all = dr.svd_all_models;
    text(s, "t-SNE: 3,000 fraud and 3,000 normal transactions", { x: 0.7, y: 1.5, w: 5.8, h: 0.4, fontSize: 15, bold: true });
    s.addImage({ path: FIG + "tsne.png", x: 0.7, y: 1.95, w: 4.9, h: 3.48, altText: "t-SNE embedding of fraud and normal transactions", objectName: "tSNE scatter" });
    text(s, "Test PR-AUC with and without SVD inputs", { x: 5.9, y: 1.5, w: 6.7, h: 0.4, fontSize: 15, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "Original features", labels: sc.models.map(m => SH[m.key]), values: sc.models.map(m => +m.pr_auc_full.toFixed(3)) },
      { name: "SVD on continuous features", labels: sc.models.map(m => SH[m.key]), values: sc.models.map(m => +m.pr_auc_svd.toFixed(3)) },
      { name: "SVD on all features", labels: all.models.map(m => SH[m.key]), values: all.models.map(m => +m.pr_auc_svd.toFixed(3)) }],
      Object.assign({ x: 5.9, y: 1.95, w: 6.7, h: 3.5, barDir: "col", chartColors: ["2B7A78", "F2B134", "E4572E"], showLegend: true, legendPos: "b", legendFontSize: 11, catAxisLabelFontSize: 10, valAxisMaxVal: 1, objectName: "SVD models chart" }, { valAxisLabelFontSize: 11, valGridLine: { style: "none" } }));
    const keep = sc.models.filter(m => m.pr_auc_svd >= 0.8 * m.pr_auc_full && m.pr_auc_full >= 0.2).length, strong = sc.models.filter(m => m.pr_auc_full >= 0.2).length;
    strip(s, fa.FaSearch, `Fraud forms local clusters (${Math.round(dr.tsne.neighbor_purity * 100)}% of a fraud point's 10 nearest neighbors are fraud).`, `SVD on the ${sc.n_continuous} continuous features keeps at least 80% of the full-feature PR-AUC for ${keep} of the ${strong} models that score above 0.2.`, 5.65); },
  cv(x, s) { const { pres, C, text, strip, R, fa } = x, ch = R.validation.chunks, W = 10.8, U = W / 100, X0 = 1.9, wd = i => (i < 6 ? 85 / 6 : 15) * U;
    const xs = i => X0 + (i < 6 ? i * 85 / 6 : 85) * U;
    const seg = (i, y, h, fill, name, tr) => s.addShape(pres.shapes.RECTANGLE, { x: xs(i), y, w: wd(i) - 0.04, h, fill: tr ? { color: fill, transparency: tr } : { color: fill }, line: { color: fill, width: 0 }, objectName: name });
    ch.forEach((c, i) => text(s, sd(c.start) + " to " + sd(c.end), { x: xs(i), y: 1.55, w: wd(i) - 0.04, h: 0.55, fontSize: 12, color: C.accent5, align: "center", valign: "middle", objectName: "Chunk label " + i }));
    text(s, "Test month", { x: xs(6), y: 1.55, w: wd(6) - 0.04, h: 0.55, fontSize: 12, bold: true, color: C.accent2, align: "center", valign: "middle" });
    for (let f = 1; f <= 5; f++) { const y = 2.2 + (f - 1) * 0.62; text(s, "Fold " + f, { x: 0.7, y, w: 1.1, h: 0.5, fontSize: 15, bold: true, valign: "middle" });
      for (let i = 0; i < 6; i++) seg(i, y, 0.5, i < f ? C.accent1 : i === f ? C.accent3 : C.background2, `Fold ${f} chunk ${i}`); seg(6, y, 0.5, C.accent2, "Test " + f, 80); }
    [[C.accent1, "Train"], [C.accent3, "Validate"], [C.background2, "Not used in this fold"], [C.accent2, "Held out until the end"]].forEach(([c, l], i) => { const lx = 1.9 + i * 2.7;
      s.addShape(pres.shapes.RECTANGLE, { x: lx, y: 5.3, w: 0.22, h: 0.22, fill: { color: c, transparency: i === 3 ? 80 : 0 }, line: { color: c, width: 0 }, objectName: "Legend " + i }); text(s, l, { x: lx + 0.3, y: 5.24, w: 2.3, h: 0.34, fontSize: 12 }); });
    const top = [...R.models].sort((a, b) => b.cv.mean_pr_auc - a.cv.mean_pr_auc).slice(0, 3);
    strip(s, fa.FaBalanceScale, "Mean CV PR-AUC (F1) across 5 folds, top three:", top.map(m => `${SH[m.key]} ${f2(m.cv.mean_pr_auc)} ± ${f2(m.cv.std_pr_auc)} (${f2(m.cv.mean_f1)})`).join("; ") + ".", 5.65); },
  // table of all eight models: owner, CV PR-AUC, CV F1, test PR-AUC, test F1
  table(x, s, y = 1.55) { const { C, R } = x, H = (t, o = {}) => ({ text: t, options: Object.assign({ bold: true, color: "FFFFFF", fill: { color: "17252A" }, align: "center", fontSize: 13 }, o) });
    const bestCv = Math.max(...R.models.map(m => m.cv.mean_pr_auc)), bestT = Math.max(...R.models.map(m => m.test.pr_auc));
    const cell = (t, o = {}) => ({ text: t, options: Object.assign({ align: "center", fontSize: 13, color: "17252A" }, o) });
    const rows = [[H("Model", { align: "left" }), H("Owner"), H("CV PR-AUC"), H("CV F1"), H("Test PR-AUC"), H("Test F1")]];
    R.models.forEach((m, i) => { const fill = { color: i % 2 ? "FFFFFF" : "E3F4F2" };
      rows.push([cell(m.name, { align: "left", bold: true, fill }), cell(OWNER[m.key], { fill }), cell(`${f2(m.cv.mean_pr_auc)} ± ${f2(m.cv.std_pr_auc)}`, { fill, bold: m.cv.mean_pr_auc === bestCv }), cell(f2(m.cv.mean_f1), { fill }),
        cell(f2(m.test.pr_auc), { fill, bold: m.test.pr_auc === bestT }), cell(f2(m.test.f1), { fill })]); });
    s.addTable(rows, { x: 0.7, y, w: 11.9, colW: [3.5, 1.2, 2.1, 1.5, 1.9, 1.7], rowH: 0.42, border: { type: "none" }, valign: "middle", margin: [0, 0.1, 0, 0.1], objectName: "Results table" }); },
};
