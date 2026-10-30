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
  pres.title = "Credit Card Fraud Detection - ML Project Proposal";
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
      { text: { text: "Credit Card Fraud Detection  |  ML Project Proposal", options: { x: 0.7, y: 6.95, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
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

  // ---------- 1. title ----------
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: SEC });
  s.addText("Detecting Credit Card Fraud with Machine Learning", { placeholder: "title" });
  s.addText([
    { text: "Machine Learning Project Proposal", options: { breakLine: true } },
    { text: "Joshua Francis and Logan Digilormo" },
  ], { placeholder: "subtitle" });
  const dots = [
    [9.0, 1.5, 3.2, 55, C.accent1], [11.2, 4.5, 1.8, 50, C.accent4], [9.3, 5.2, 1.1, 60, C.accent6],
    [11.6, 1.7, 0.7, 40, C.accent6], [10.9, 2.9, 0.45, 30, C.accent4], [8.7, 3.9, 0.5, 45, C.accent4],
  ];
  dots.forEach(([x, y, d, t, c], i) =>
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: c, transparency: t }, line: { color: c, transparency: t, width: 0 }, objectName: "Decor circle " + (i + 1) }));
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.5, w: 0.6, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: "Flagged transaction dot" });
  s.addNotes("JOSH: Hi everyone, I'm Josh, and this is Logan. Our project is about detecting credit card fraud using machine learning. We'll walk you through the problem, our data, how we plan to model it, and what we expect to get out of it. Logan will start with the problem.");

  // ---------- 2. problem ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Fraud is rare, costly, and hard to spot", { placeholder: "title" });
  const probs = [
    ["The goal", "Predict whether a credit card transaction is fraud, using its amount, category, time, and location."],
    ["The key signal", "A purchase far from the cardholder's home, or out of pattern for that cardholder, is more suspicious."],
    ["The challenge", "Fraud is a tiny fraction of transactions, so the model has to find a few needles in a very large haystack."],
  ];
  probs.forEach(([h, b], i) => {
    const y = 1.75 + i * 1.65;
    text(s, h, { x: 0.7, y, w: 6.4, h: 0.4, fontSize: 20, bold: true, color: C.accent1, objectName: "Problem label " + (i + 1) });
    text(s, b, { x: 0.7, y: y + 0.5, w: 6.4, h: 1.0, fontSize: 16, objectName: "Problem text " + (i + 1) });
  });
  const fr = 5, fc = 3;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const flagged = r === fr && c === fc;
    s.addShape(pres.shapes.OVAL, {
      x: 8.0 + c * 0.45, y: 1.75 + r * 0.45, w: 0.34, h: 0.34,
      fill: { color: flagged ? C.accent2 : C.accent6 }, line: { color: flagged ? C.accent2 : C.accent6, width: 0 },
      objectName: flagged ? "Fraud dot" : "Normal dot " + (r * 10 + c + 1),
    });
  }
  text(s, "Illustration: 1 fraud in every 100 transactions", { x: 8.0, y: 6.3, w: 4.7, h: 0.35, fontSize: 12, color: C.accent5, objectName: "Dot caption" });
  s.addNotes("LOGAN: Thanks, Josh. Our goal is to predict whether a credit card transaction is fraud, based on things like the amount, category, time, and location. A big signal is where the purchase happened. If it's far from the cardholder's home, or just out of pattern for that person, it looks suspicious. The challenge is that fraud is a tiny fraction of all transactions. On this slide, one dot in a hundred is fraud, and in our generated data it's about 1.2 in a hundred, so the model has to find a few needles in a very large haystack. Josh will tell you where our data comes from.");

  // ---------- 3. data ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("A public dataset we generate ourselves", { placeholder: "title" });
  const dcards = [
    [fa.FaGithub, "Source", "Sparkov Data Generation: a public GitHub tool that simulates credit card transactions, including fraud.", "namebrandon/Sparkov_Data_Generation"],
    [fa.FaDatabase, "What it contains", "Customers with a home location, merchants with a category and location, amounts, timestamps, and a fraud label.", null],
    [fa.FaShieldAlt, "Why this dataset", "No private or personal data. It is public and reproducible, and we can generate as much as we need.", null],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.075, [Ic, h, b, u] = dcards[i];
    card(s, x, 1.8, 3.75, 4.1, "Data card " + (i + 1));
    await circleIcon(s, Ic, x + 0.35, 2.15, 0.8, "Data " + h);
    text(s, h, { x: x + 0.35, y: 3.2, w: 3.05, h: 0.45, fontSize: 20, bold: true, objectName: "Data header " + (i + 1) });
    text(s, b, { x: x + 0.35, y: 3.75, w: 3.05, h: 1.9, fontSize: 15, objectName: "Data text " + (i + 1) });
    if (u) text(s, u, { x: x + 0.35, y: 5.3, w: 3.05, h: 0.4, fontSize: 11, color: C.accent1, objectName: "Data link" });
  }
  s.addNotes("JOSH: For data, we're using the Sparkov Data Generation tool, which is public on GitHub. It simulates credit card transactions, including fraud. It gives us customers with a home location, merchants with a category and location, amounts, timestamps, and a fraud label. Since it's simulated, there's no private or personal data involved, and we can generate as much as we need. Logan will explain what we do with it.\n\nSource: https://github.com/namebrandon/Sparkov_Data_Generation. Confirm exact column names after generating the CSVs.");

  // ---------- 4. features ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Features that capture normal card behavior", { placeholder: "title" });
  const feats = [
    [fa.FaMapMarkedAlt, "Location", "Distance from the customer's home to the merchant, using the haversine formula."],
    [fa.FaClock, "Time", "Hour of day, weekend flag, and customer age at the time of purchase."],
    [fa.FaUserClock, "Customer behavior", "Amount compared to the customer's average, and transaction counts in the past hour and day."],
    [fa.FaRoute, "Movement", "Time and distance since the customer's previous transaction."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.7 + (i % 2) * 6.1, y = 1.7 + Math.floor(i / 2) * 2.5, [Ic, h, b] = feats[i];
    card(s, x, y, 5.8, 2.2, "Feature card " + (i + 1));
    await circleIcon(s, Ic, x + 0.35, y + 0.7, 0.8, "Feature " + h);
    text(s, h, { x: x + 1.5, y: y + 0.35, w: 4.0, h: 0.45, fontSize: 20, bold: true, objectName: "Feature header " + (i + 1) });
    text(s, b, { x: x + 1.5, y: y + 0.9, w: 4.0, h: 1.1, fontSize: 15, objectName: "Feature text " + (i + 1) });
  }
  s.addNotes("LOGAN: Raw columns only get us so far, so we'll build features that capture normal card behavior. For location, we'll calculate the distance from the customer's home to the merchant. For time, we'll use hour of day, weekend, and customer age. For behavior, we'll compare each amount to the customer's average and count how many transactions happened in the past hour and day. And for movement, we'll look at how much time and distance has passed since their previous transaction. All of these only use past transactions, so nothing from the future leaks into training. Josh will cover the models.");

  // ---------- 5. methods ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Four models, compared fairly", { placeholder: "title" });
  const models = [
    [fa.FaChartLine, "Logistic regression", "Baseline", "Learns a weight per feature and outputs a fraud probability. Simple and explainable."],
    [fa.FaSitemap, "Decision tree", "Single tree", "One flowchart of yes/no questions. Easy to read, but can overfit on its own."],
    [fa.FaTree, "Random forest", "Ensemble", "Hundreds of trees vote. Captures non-linear patterns and reports feature importance."],
    [fa.FaRocket, "Gradient boosting", "Boosting", "Trees built in sequence, each fixing the last one's mistakes. Often strongest on tables."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.7 + i * 3.033, [Ic, h, tag, b] = models[i];
    card(s, x, 1.7, 2.8, 3.3, "Model card " + (i + 1));
    await circleIcon(s, Ic, x + 0.3, 2.0, 0.7, "Model " + h);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 1.15, y: 2.17, w: 1.4, h: 0.36, rectRadius: 0.18, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: "Model tag " + (i + 1) });
    text(s, tag, { x: x + 1.15, y: 2.17, w: 1.4, h: 0.36, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "Model tag text " + (i + 1) });
    text(s, h, { x: x + 0.3, y: 3.0, w: 2.3, h: 0.4, fontSize: 17, bold: true, objectName: "Model header " + (i + 1) });
    text(s, b, { x: x + 0.3, y: 3.5, w: 2.3, h: 1.4, fontSize: 14, objectName: "Model text " + (i + 1) });
  }
  card(s, 0.7, 5.3, 11.9, 1.3, "Imbalance strip");
  await circleIcon(s, fa.FaBalanceScale, 1.0, 5.55, 0.8, "Imbalance", C.accent3, "#17252A");
  text(s, [
    { text: "Handling imbalance: ", options: { bold: true } },
    { text: "class weights tell every model that missing a fraud costs more than a false alarm. Built with Python, pandas, scikit-learn, and XGBoost or LightGBM." },
  ], { x: 2.1, y: 5.55, w: 10.2, h: 0.8, fontSize: 16, valign: "middle", objectName: "Imbalance text" });
  s.addNotes("JOSH: Thanks, Logan. We're comparing four models, from simple to powerful. Logistic regression is our baseline. It learns a weight for each feature and outputs a fraud probability. A decision tree is a single flowchart of yes/no questions, which is easy to read but can overfit. A random forest combines hundreds of trees that vote, which captures non-linear patterns and shows which features matter most. And gradient boosting builds trees one after another, each fixing the last one's mistakes, and it's often the strongest on tables like ours. To deal with the imbalance, we'll use class weights, so every model treats a missed fraud as more costly than a false alarm. We'll build everything in Python with scikit-learn and XGBoost or LightGBM. Logan will explain how we measure the results.");

  // ---------- 6. metrics ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Accuracy would mislead us", { placeholder: "title" });
  card(s, 0.7, 1.7, 4.6, 4.6, "Accuracy trap card", C.text1);
  text(s, "98.8%", { x: 1.1, y: 2.2, w: 3.8, h: 1.3, fontSize: 66, bold: true, color: C.accent3, objectName: "Accuracy stat" });
  text(s, "accuracy from predicting \"not fraud\" every time, when fraud is about 1.2% of transactions. It catches zero fraud.", { x: 1.1, y: 3.7, w: 3.8, h: 2.2, fontSize: 16, color: C.background1, objectName: "Accuracy caption" });
  const mets = [
    ["Precision", "Of the transactions we flag, how many are really fraud."],
    ["Recall", "Of all real fraud, how much we catch."],
    ["F1 score", "One number balancing precision and recall. Our main comparison metric."],
  ];
  mets.forEach(([h, b], i) => {
    const y = 1.7 + i * 1.6;
    card(s, 5.6, y, 7.0, 1.4, "Metric card " + (i + 1));
    text(s, h, { x: 6.0, y: y + 0.25, w: 6.2, h: 0.4, fontSize: 20, bold: true, color: C.accent1, objectName: "Metric header " + (i + 1) });
    text(s, b, { x: 6.0, y: y + 0.7, w: 6.2, h: 0.6, fontSize: 16, objectName: "Metric text " + (i + 1) });
  });
  s.addNotes("LOGAN: We can't use accuracy here. Fraud is only about 1.2% of our transactions, so a model that says \"not fraud\" every single time is 98.8% accurate and catches nothing. So we'll use precision, which is how many flagged transactions are really fraud, and recall, which is how much of the real fraud we catch. F1 combines the two, and that will be our main number for comparing models. Josh will walk through the plan.");

  // ---------- 7. plan ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Plan: from raw data to a scored demo", { placeholder: "title" });
  const steps = [
    ["Generate data", "Run the Sparkov generator for customers, merchants, and a date range, then load it into pandas."],
    ["Preprocess", "Drop identifiers (name, street, card number), parse timestamps, one-hot encode categories, and scale inputs for logistic regression."],
    ["Engineer features", "Build distance, time, and per-customer history features using only past transactions."],
    ["Split by time", "Train on earlier transactions and test on later ones, as a real fraud system would."],
    ["Train and compare", "Logistic regression baseline versus decision tree, random forest, and gradient boosting, all with class weights, tuned on a validation set."],
    ["Evaluate and demo", "Report precision, recall, and F1, plus feature importance, then score hand-built normal and suspicious transactions."],
  ];
  steps.forEach(([h, b], i) => {
    const y = 1.6 + i * 0.86;
    card(s, 0.7, y, 11.9, 0.72, "Step row " + (i + 1));
    s.addShape(pres.shapes.OVAL, { x: 0.82, y: y + 0.07, w: 0.58, h: 0.58, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: "Step number circle " + (i + 1) });
    text(s, String(i + 1), { x: 0.82, y: y + 0.07, w: 0.58, h: 0.58, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "Step number " + (i + 1) });
    text(s, h, { x: 1.7, y, w: 2.8, h: 0.72, fontSize: 18, bold: true, valign: "middle", objectName: "Step title " + (i + 1) });
    text(s, b, { x: 4.6, y, w: 7.8, h: 0.72, fontSize: 14, valign: "middle", objectName: "Step text " + (i + 1) });
  });
  s.addNotes("JOSH: Here's the plan from start to finish. First, we generate the data and load it into pandas. Second, we preprocess it: drop identifiers like name, street, and card number, parse timestamps, one-hot encode categories, and scale inputs for logistic regression. Third, we engineer the features Logan described. Fourth, we split by time, training on earlier transactions and testing on later ones, like a real fraud system would. Fifth, we train and compare all four models and tune them on a validation set. And last, we evaluate with our metrics and run a demo on hand-built transactions.");

  // ---------- 8. related work ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Related work on the same data", { placeholder: "title" });
  card(s, 0.7, 1.7, 5.8, 4.6, "Existing project card");
  text(s, "EXISTING PROJECT", { x: 1.1, y: 2.1, w: 5.0, h: 0.35, fontSize: 12, bold: true, color: C.accent5, objectName: "Existing label" });
  text(s, "Credit Card Fraud Detection", { x: 1.1, y: 2.5, w: 5.0, h: 0.5, fontSize: 24, bold: true, objectName: "Existing title" });
  text(s, "by sharmasapna on GitHub", { x: 1.1, y: 3.05, w: 5.0, h: 0.4, fontSize: 16, color: C.accent1, objectName: "Existing author" });
  text(s, "Classifies fraud on Sparkov-generated transactions: about 1.3 million transactions across 1,000 customers and 800 merchants.", { x: 1.1, y: 3.7, w: 5.0, h: 1.4, fontSize: 16, objectName: "Existing text" });
  text(s, "github.com/sharmasapna/credit-card-fraud-detection", { x: 1.1, y: 5.55, w: 5.0, h: 0.4, fontSize: 11, color: C.accent1, objectName: "Existing link" });
  card(s, 6.8, 1.7, 5.8, 4.6, "Our focus card", C.accent1);
  text(s, "Our focus", { x: 7.2, y: 2.1, w: 5.0, h: 0.5, fontSize: 24, bold: true, color: C.background1, objectName: "Focus title" });
  const focus = ["Distance-from-home feature", "Per-customer behavior features", "Time-based train and test split", "Precision, recall, and F1 for four models", "A scoring demo on hand-built transactions"];
  text(s, focus.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < focus.length - 1, paraSpaceAfter: 10 } })),
    { x: 7.2, y: 2.9, w: 5.0, h: 3.0, fontSize: 16, color: C.background1, objectName: "Focus list" });
  s.addNotes("LOGAN: There's an existing project on GitHub by sharmasapna that also classifies fraud on Sparkov data, about 1.3 million transactions across 1,000 customers and 800 merchants. Our focus is a bit different: the distance-from-home feature, per-customer behavior features, a time-based split, a four-model comparison with precision, recall, and F1, and a scoring demo.\n\nSource: https://github.com/sharmasapna/credit-card-fraud-detection");

  // ---------- 9. outcomes ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("What we expect to deliver", { placeholder: "title" });
  const outs = [
    [fa.FaChartLine, "Beat the baseline", "Random forest and gradient boosting improve recall and F1 over logistic regression."],
    [fa.FaSortAmountDown, "Useful features", "Distance and behavior features rank high in feature importance."],
    [fa.FaPlayCircle, "A working demo", "A trained model that scores hand-built normal and suspicious transactions."],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.7 + i * 4.075, [Ic, h, b] = outs[i];
    card(s, x, 1.7, 3.75, 3.0, "Outcome card " + (i + 1));
    await circleIcon(s, Ic, x + 0.35, 2.05, 0.8, "Outcome " + h);
    text(s, h, { x: x + 0.35, y: 3.1, w: 3.05, h: 0.45, fontSize: 20, bold: true, objectName: "Outcome header " + (i + 1) });
    text(s, b, { x: x + 0.35, y: 3.65, w: 3.05, h: 1.2, fontSize: 15, objectName: "Outcome text " + (i + 1) });
  }
  card(s, 0.7, 5.0, 11.9, 1.3, "Limitation strip");
  await circleIcon(s, fa.FaExclamationTriangle, 1.0, 5.25, 0.8, "Limitation", C.accent3, "#17252A");
  text(s, [
    { text: "Known limitation: ", options: { bold: true } },
    { text: "the data is simulated, so results may not transfer directly to real-world spending." },
  ], { x: 2.1, y: 5.25, w: 10.2, h: 0.8, fontSize: 16, valign: "middle", objectName: "Limitation text" });
  s.addNotes("JOSH: We expect the random forest and gradient boosting to beat the logistic regression baseline on recall and F1. We also expect the distance and behavior features to rank high in feature importance. And we'll end with a working demo that scores normal and suspicious hand-built transactions. One limitation is that the data is simulated, so results may not transfer directly to real-world spending. Logan will close with the timeline.");

  // ---------- 10. timeline ----------
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SEC });
  s.addText("Timeline and milestones", { placeholder: "title" });
  s.addShape(pres.shapes.LINE, { x: 1.4, y: 3.15, w: 10.5, h: 0, line: { color: C.accent6, width: 3 }, objectName: "Timeline line" });
  const miles = [
    ["Oct 20 & 22", "Proposal", "Idea, methods, metrics, and plan."],
    ["Nov 10 & 12", "Intermediate", "Data generated, features built, baseline results, and limitations."],
    ["Nov 24 & 26", "Final presentation", "All four models tuned and compared, demo working."],
    ["Dec 6", "Final report", "Write-up submitted and code on GitHub."],
  ];
  miles.forEach(([d, h, b], i) => {
    const x = 0.7 + i * 3.07, cx = x + 1.35;
    text(s, d, { x, y: 2.1, w: 2.7, h: 0.5, fontSize: 22, bold: true, color: C.accent1, align: "center", objectName: "Milestone date " + (i + 1) });
    s.addShape(pres.shapes.OVAL, { x: cx - 0.25, y: 2.9, w: 0.5, h: 0.5, fill: { color: i === 0 ? C.accent2 : C.accent1 }, line: { color: C.background1, width: 3 }, objectName: "Milestone dot " + (i + 1) });
    card(s, x, 3.8, 2.7, 2.0, "Milestone card " + (i + 1));
    text(s, h, { x: x + 0.25, y: 4.05, w: 2.2, h: 0.4, fontSize: 18, bold: true, objectName: "Milestone header " + (i + 1) });
    text(s, b, { x: x + 0.25, y: 4.55, w: 2.2, h: 1.5, fontSize: 14, objectName: "Milestone text " + (i + 1) });
  });
  s.addNotes("LOGAN: For the timeline, today is the proposal. By the intermediate presentation, we'll have the data generated, features built, and baseline results, along with limitations. By the final presentation, all four models will be tuned and compared with the demo working. The final report and code go on GitHub on December 6th. Thanks, we're happy to take questions.");

  await pres.writeFile({ fileName: "/home/claude/Fraud_Detection_Proposal.pptx" });
  await applyTheme("/home/claude/Fraud_Detection_Proposal.pptx", THEME);
  console.log("done");
})();
