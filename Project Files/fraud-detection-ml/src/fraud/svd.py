"""Truncated SVD helpers. Scale each column (divide by its standard deviation) WITHOUT centering, then take the SVD.
SVD of the centered matrix is exactly PCA, so the only difference between the two is the centering step. The SVD is computed exactly
from the small (features x features) Gram matrix Z'Z via an eigendecomposition: eigenvalues are the squared singular values, eigenvectors are V."""
import numpy as np

def svd_fit(Xd):
    sd = Xd.std(axis=0); sd[sd == 0] = 1.0
    Z = Xd / sd
    w, V = np.linalg.eigh(Z.astype(np.float64).T @ Z.astype(np.float64))
    o = np.argsort(w)[::-1]; w, V = np.clip(w[o], 0, None), V[:, o]
    return {"sd": sd, "V": V, "s2": w}

def svd_transform(f, X, k=None):
    Z = (X / f["sd"]).astype(np.float64) @ f["V"]
    return Z if k is None else Z[:, :k]

def energy(f): return f["s2"] / f["s2"].sum()

def k_for(cum, q): return int(np.searchsorted(cum, q) + 1)

def pca_cum(Xd):
    Zc = (Xd - Xd.mean(0)); sd = Xd.std(0); sd[sd == 0] = 1.0; Zc = (Zc / sd).astype(np.float64)
    w = np.sort(np.clip(np.linalg.eigvalsh(Zc.T @ Zc), 0, None))[::-1]
    return np.cumsum(w / w.sum())
