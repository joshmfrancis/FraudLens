// Shared slide bodies for the dimensionality-reduction and cross-validation slides (used by the intermediate and final decks).
const FIG = "/home/claude/fraud-detection-ml/reports/figures/";
const sd = d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const base = { catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, valGridLine: { style: "none" } };
module.exports = {
  pca(x, s) { const { pres, C, text, strip, R, fa } = x, dr = R.dataset && R.dimred;
    text(s, "Share of variance explained by each component", { x: 0.7, y: 1.5, w: 6.0, h: 0.4, fontSize: 15, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "Variance explained", labels: dr.explained.slice(0, 12).map((_, i) => "PC" + (i + 1)), values: dr.explained.slice(0, 12) }],
      Object.assign({ x: 0.7, y: 1.95, w: 6.0, h: 3.5, barDir: "col", chartColors: ["2B7A78"], showLegend: false, valAxisLabelFormatCode: "0%", objectName: "Scree chart" }, base));
    text(s, "First two components (60,000 sampled transactions)", { x: 7.2, y: 1.5, w: 5.4, h: 0.4, fontSize: 15, bold: true });
    s.addImage({ path: FIG + "pca_2d.png", x: 7.2, y: 1.95, w: 4.9, h: 3.48, altText: "PCA projection of normal and fraud transactions", objectName: "PCA scatter" });
    strip(s, fa.FaSortAmountDown, `${dr.k95} of ${dr.n_features} components keep 95% of the variance.`, `The first two keep ${Math.round(dr.pc12_variance * 100)}%: PC1 tracks recent activity, PC2 tracks amount.`, 5.65); },
  tsne(x, s) { const { pres, C, text, strip, R, fa } = x, dr = R.dimred, pc = dr.pca_continuous, f2 = v => v.toFixed(2);
    text(s, "t-SNE: 3,000 fraud and 3,000 normal transactions", { x: 0.7, y: 1.5, w: 5.8, h: 0.4, fontSize: 15, bold: true });
    s.addImage({ path: FIG + "tsne.png", x: 0.7, y: 1.95, w: 4.9, h: 3.48, altText: "t-SNE embedding of fraud and normal transactions", objectName: "tSNE scatter" });
    text(s, "Test PR-AUC with and without PCA inputs", { x: 6.5, y: 1.5, w: 6.1, h: 0.4, fontSize: 15, bold: true });
    s.addChart(pres.charts.BAR, [{ name: "Original features", labels: pc.models.map(m => m.name), values: pc.models.map(m => +m.pr_auc_full.toFixed(3)) },
      { name: "PCA on continuous features", labels: pc.models.map(m => m.name), values: pc.models.map(m => +m.pr_auc_pca.toFixed(3)) }],
      Object.assign({ x: 6.5, y: 1.95, w: 6.1, h: 3.5, barDir: "col", chartColors: ["2B7A78", "F2B134"], showLegend: true, legendPos: "b", legendFontSize: 12, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontSize: 11, valAxisMaxVal: 1, objectName: "PCA models chart" }, base));
    const rf = pc.models.find(m => m.key === "rf"), all = dr.pca_all_models.models.find(m => m.key === "rf"), f3 = v => v.toFixed(3);
    strip(s, fa.FaSearch, `Fraud forms local clusters (${Math.round(dr.tsne.neighbor_purity * 100)}% of a fraud point's 10 nearest neighbors are fraud).`, `Random forest keeps ${f2(rf.pr_auc_pca)} of ${f2(rf.pr_auc_full)} after PCA on continuous inputs, but only ${f3(all.pr_auc_pca)} after PCA on all ${dr.n_features} features.`, 5.65); },
  cv(x, s) { const { pres, C, text, strip, R, fa } = x, ch = R.validation.chunks, M = Object.fromEntries(R.models.map(m => [m.key, m])), W = 10.8, U = W / 100, X0 = 1.9, wd = i => (i < 6 ? 85 / 6 : 15) * U;
    const xs = i => X0 + (i < 6 ? i * 85 / 6 : 85) * U;
    const seg = (i, y, h, fill, name, tr) => s.addShape(pres.shapes.RECTANGLE, { x: xs(i), y, w: wd(i) - 0.04, h, fill: tr ? { color: fill, transparency: tr } : { color: fill }, line: { color: fill, width: 0 }, objectName: name });
    ch.forEach((c, i) => text(s, sd(c.start) + " to " + sd(c.end), { x: xs(i), y: 1.55, w: wd(i) - 0.04, h: 0.55, fontSize: 12, color: C.accent5, align: "center", valign: "middle", objectName: "Chunk label " + i }));
    text(s, "Test month", { x: xs(6), y: 1.55, w: wd(6) - 0.04, h: 0.55, fontSize: 12, bold: true, color: C.accent2, align: "center", valign: "middle" });
    for (let f = 1; f <= 5; f++) { const y = 2.2 + (f - 1) * 0.62; text(s, "Fold " + f, { x: 0.7, y, w: 1.1, h: 0.5, fontSize: 15, bold: true, valign: "middle" });
      for (let i = 0; i < 6; i++) seg(i, y, 0.5, i < f ? C.accent1 : i === f ? C.accent3 : C.background2, `Fold ${f} chunk ${i}`); seg(6, y, 0.5, C.accent2, "Test " + f, 80); }
    [[C.accent1, "Train"], [C.accent3, "Validate"], [C.background2, "Not used in this fold"], [C.accent2, "Held out until the end"]].forEach(([c, l], i) => { const lx = 1.9 + i * 2.7;
      s.addShape(pres.shapes.RECTANGLE, { x: lx, y: 5.3, w: 0.22, h: 0.22, fill: { color: c, transparency: i === 3 ? 80 : 0 }, line: { color: c, width: 0 }, objectName: "Legend " + i }); text(s, l, { x: lx + 0.3, y: 5.24, w: 2.3, h: 0.34, fontSize: 12 }); });
    const f = (m) => `${m.cv.mean_pr_auc.toFixed(2)} \u00B1 ${m.cv.std_pr_auc.toFixed(2)}`;
    strip(s, fa.FaBalanceScale, "Mean PR-AUC across the 5 folds:", `random forest ${f(M.rf)}, decision tree ${f(M.tree)}, gradient boosting ${f(M.gb)}.`, 5.65); },
};
