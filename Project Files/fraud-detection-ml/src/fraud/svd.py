"""Truncated SVD helpers. Scale each column (divide by its standard deviation) WITHOUT centering, then take the SVD.
SVD of the centered matrix is exactly PCA, so the only difference between the two is the centering step. The SVD is computed exactly
from the small (features x features) Gram matrix Z'Z via an eigendecomposition: eigenvalues are the squared singular values, eigenvectors are V."""
import numpy as np

# Fit: scale each column by its std (NOT centered), then get the SVD from the eigendecomposition of Z'Z.
# Returns the scaling (sd), the directions (V), and the squared singular values (s2).
def svd_fit(Xd):
    sd = Xd.std(axis=0); sd[sd == 0] = 1.0
    Z = Xd / sd
    w, V = np.linalg.eigh(Z.astype(np.float64).T @ Z.astype(np.float64))
    # sort directions from most to least energy
    o = np.argsort(w)[::-1]; w, V = np.clip(w[o], 0, None), V[:, o]
    return {"sd": sd, "V": V, "s2": w}

# Project data onto the learned directions; keep only the first k (the reduced inputs)
def svd_transform(f, X, k=None):
    Z = (X / f["sd"]).astype(np.float64) @ f["V"]
    return Z if k is None else Z[:, :k]

# share of the total energy each component captures
def energy(f): return f["s2"] / f["s2"].sum()

# smallest number of components whose cumulative energy reaches q (e.g. 0.95)
def k_for(cum, q): return int(np.searchsorted(cum, q) + 1)

# Same calculation but AFTER centering = PCA; used only to show PCA needs more components (25 vs 22) than uncentered SVD
def pca_cum(Xd):
    Zc = (Xd - Xd.mean(0)); sd = Xd.std(0); sd[sd == 0] = 1.0; Zc = (Zc / sd).astype(np.float64)
    w = np.sort(np.clip(np.linalg.eigvalsh(Zc.T @ Zc), 0, None))[::-1]
    return np.cumsum(w / w.sum())
