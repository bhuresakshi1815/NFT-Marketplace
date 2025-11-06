// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import NFTABI from "./NFTABI.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0";
const LOCAL_RPC = "http://127.0.0.1:8545";

// Hardhat default dev private keys (local dev only)
const HARDAHT_PRIVATE_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xde9be858da4a475276426320d5e9262ecfc3ba460fac56360bfa6c4c28b4ee0",
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"
];

function formatEth(wei) {
  try { return ethers.formatEther(wei || "0"); } catch { return "0"; }
}
function toWei(eth) {
  return ethers.parseEther(String(eth || "0"));
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [localAccounts, setLocalAccounts] = useState([]); // address strings
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [account, setAccount] = useState(null); // signer address
  const [items, setItems] = useState([]);
  const [mintURI, setMintURI] = useState("");
  const [priceInput, setPriceInput] = useState("");

  useEffect(() => {
    console.log("[APP LOADED] Init App.jsx", new Date().toISOString());
    (async () => {
      try {
        const jsonProv = new ethers.JsonRpcProvider(LOCAL_RPC);
        setProvider(jsonProv);

        // 1) prefer reading accounts directly from node (unlocked accounts)
        let nodeAccounts = [];
        try {
          // try standard APIs
          nodeAccounts = await jsonProv.send("eth_accounts", []);
          if (!Array.isArray(nodeAccounts) || nodeAccounts.length === 0) {
            // try listAccounts convenience method
            nodeAccounts = await jsonProv.listAccounts();
          }
        } catch (err) {
          console.debug("[init] eth_accounts/listAccounts failed:", err);
          nodeAccounts = [];
        }

        if (Array.isArray(nodeAccounts) && nodeAccounts.length > 0) {
          console.debug("[init] found node accounts:", nodeAccounts);
          setLocalAccounts(nodeAccounts.map(a => String(a)));
          // attach read/write signer to first node account if provider supports getSigner(address)
          try {
            const s = jsonProv.getSigner(nodeAccounts[0]);
            setSigner(s);
            const addr = await s.getAddress();
            setAccount(addr);
            setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, s));
            setSelectedIndex(0);
            console.debug("[init] using node unlocked signer", addr);
          } catch (err) {
            console.debug("[init] could not create signer from node account:", err);
            setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, jsonProv));
          }
          return;
        }

        // 2) fallback: derive addresses from HARDAHT_PRIVATE_KEYS, but skip invalid keys
        const derived = [];
        for (let i = 0; i < HARDAHT_PRIVATE_KEYS.length; i++) {
          const pk = HARDAHT_PRIVATE_KEYS[i];
          try {
            // ensure valid wallet; skip if invalid
            const w = new ethers.Wallet(pk);
            derived.push(w.address);
          } catch (err) {
            console.warn("[init] skipping invalid dev private key at index", i, err);
          }
        }

        if (derived.length > 0) {
          setLocalAccounts(derived);
          setSelectedIndex(0);
          try {
            // do not create Wallets for all keys; create only one wallet attached to provider
            const wallet = new ethers.Wallet(HARDAHT_PRIVATE_KEYS[0], jsonProv);
            setSigner(wallet);
            setAccount(await wallet.getAddress());
            setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, wallet));
            console.debug("[init] using Wallet signer for index 0", await wallet.getAddress());
          } catch (err) {
            console.debug("[init] wallet signer creation failed:", err);
            setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, jsonProv));
          }
        } else {
          // nothing available — read-only contract
          console.debug("[init] no node accounts and no valid dev keys found — using read-only provider");
          setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, jsonProv));
        }
      } catch (err) {
        console.error("[init] provider init error", err);
      }
    })();
  }, []);

  // Called when user picks a different local account index
  async function onSelectIndex(val) {
    const idx = Number(val);
    setSelectedIndex(idx);
    if (!provider) return alert("Local provider not ready.");
    // prefer node unlocked signer if provider exposes getSigner for that address
    // but since we may be using Wallet fallbacks, construct a Wallet from the matching private key
    try {
      // if node returned accounts and they match our derived list, use provider.getSigner
      const provAccounts = (await provider.listAccounts()) || [];
      if (provAccounts.length > 0 && provAccounts[idx]) {
        const s = provider.getSigner(provAccounts[idx]);
        setSigner(s);
        setAccount(await s.getAddress());
        setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, s));
        console.debug("[onSelectIndex] switched to node signer", await s.getAddress());
        return;
      }
    } catch (err) {
      // ignore and fallback to Wallet
      console.debug("[onSelectIndex] provider.getSigner failed:", err);
    }

    // fallback: create Wallet from HARDAHT_PRIVATE_KEYS if index valid
    if (idx < 0 || idx >= HARDAHT_PRIVATE_KEYS.length) return alert("Invalid account index");
    try {
      const pk = HARDAHT_PRIVATE_KEYS[idx];
      const wallet = new ethers.Wallet(pk, provider);
      setSigner(wallet);
      const addr = await wallet.getAddress();
      setAccount(addr);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, NFTABI, wallet));
      console.debug("[onSelectIndex] switched to wallet signer", idx, addr);
    } catch (err) {
      console.error("[onSelectIndex] set signer error", err);
      alert("Could not use selected account. Make sure `npx hardhat node` is running and keys are valid.");
    }
  }

  async function refresh() {
    if (!contract) return;
    try {
      const total = await contract.totalMinted();
      const n = Number(total || 0);
      const arr = [];
      for (let i = 1; i <= n; i++) {
        try {
          const uri = await contract.tokenURI(i);
          const owner = await contract.ownerOf(i);
          const listing = await contract.listings(i);
          arr.push({
            id: i,
            uri,
            owner,
            price: listing.price?.toString?.() || "0"
          });
        } catch (e) {
          console.debug("token read error", i, e);
        }
      }
      setItems(arr);
    } catch (err) {
      console.error("refresh error", err);
    }
  }

  useEffect(() => { if (contract) refresh(); }, [contract]);

  async function mint() {
    if (!mintURI) return alert("Provide image URL");
    if (!contract || !signer) return alert("No signer available. Select a local account.");
    try {
      // contract already connected to signer (we set it that way) but be safe
      const c = contract.connect ? contract.connect(signer) : new ethers.Contract(CONTRACT_ADDRESS, NFTABI, signer);
      const tx = await c.mintNFT(mintURI);
      if (tx.wait) await tx.wait();
      setMintURI("");
      await refresh();
      alert("Mint successful");
    } catch (e) {
      console.error("mint err", e);
      alert("Mint failed: " + (e?.reason || e?.message || e));
    }
  }

  async function listToken(id) {
    if (!priceInput) return alert("Enter price in ETH");
    if (!contract || !signer) return alert("No signer available.");
    try {
      const c = contract.connect ? contract.connect(signer) : new ethers.Contract(CONTRACT_ADDRESS, NFTABI, signer);
      const priceWei = toWei(priceInput);
      const tx = await c.listToken(id, priceWei);
      if (tx.wait) await tx.wait();
      setPriceInput("");
      await refresh();
      alert("Listed successfully");
    } catch (e) {
      console.error("list err", e);
      alert("List failed: " + (e?.reason || e?.message || e));
    }
  }

  async function buyToken(id, priceWei) {
    if (!contract || !signer) return alert("No signer available.");
    try {
      const c = contract.connect ? contract.connect(signer) : new ethers.Contract(CONTRACT_ADDRESS, NFTABI, signer);
      const tx = await c.buyToken(id, { value: priceWei });
      if (tx.wait) await tx.wait();
      await refresh();
      alert("Purchase successful");
    } catch (e) {
      console.error("buy err", e);
      alert("Buy failed: " + (e?.reason || e?.message || e));
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", maxWidth: 1100, margin: "24px auto", padding: 20, background: "#0f0f10", color: "#e6e6e9" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Simple NFT Marketplace</h1>
          <div style={{ fontSize: 13, color: "#b9b9bd", marginTop: 6 }}>Local Hardhat mode — using {LOCAL_RPC}</div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#999" }}>Network: Local Hardhat</div>
          <div style={{ marginTop: 8 }}>
            {account ? (
              <span style={{ fontSize: 13, padding: "8px 12px", background: "#141414", border: "1px solid #333", borderRadius: 8 }}>{account.slice(0,6)}...{account.slice(-4)}</span>
            ) : (
              <span style={{ fontSize: 13, padding: "8px 12px", background: "#333", borderRadius: 8 }}>No account selected</span>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
        <div style={{ padding: 18, borderRadius: 10, background: "#121213", border: "1px solid #222" }}>
          <h3 style={{ marginTop: 0 }}>Mint NFT</h3>

          {localAccounts.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#bdbdc1" }}>From account</label>
              <select value={selectedIndex ?? ""} onChange={(e)=>onSelectIndex(e.target.value)} style={{ display: "block", width: "100%", padding: 10, marginTop: 8, borderRadius: 8, background: "#0f0f10", color: "#e6e6e9", border: "1px solid #333" }}>
                {localAccounts.map((addr, idx) => (<option key={`${addr}-${idx}`} value={idx}>{addr}</option>))}
              </select>
              <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Choose which unlocked Hardhat account will mint the token.</div>
            </div>
          ) : (
            <div style={{ marginBottom: 12, color: "#c7c7c7" }}>No unlocked local accounts found. Make sure <code>npx hardhat node</code> is running.</div>
          )}

          <input value={mintURI} onChange={(e)=>setMintURI(e.target.value)} placeholder="Image URL (e.g. https://i.imgur.com/xxx.png)" style={{ width: "100%", padding: 10, borderRadius: 8, background: "#0d0d0f", color: "#eee", border: "1px solid #222" }} />
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={mint} style={{ padding: "10px 14px", borderRadius: 8, background: "#1f6feb", border: "none", color: "#fff", cursor: "pointer" }}>Mint</button>
            <button onClick={refresh} style={{ padding: "10px 14px", borderRadius: 8, background: "#222", border: "1px solid #333", color: "#ddd", cursor: "pointer" }}>Refresh</button>
          </div>
        </div>

        <aside style={{ padding: 18, borderRadius: 10, background: "#121213", border: "1px solid #222" }}>
          <h3 style={{ marginTop: 0 }}>About this prototype</h3>
          <p style={{ color: "#cfcfd2", fontSize: 14, lineHeight: 1.5 }}>
            This view is forced into local-only mode to avoid MetaMask issues. The app uses your running Hardhat node ({LOCAL_RPC}).
          </p>
          <div style={{ marginTop: 10, fontSize: 13, color: "#aaa" }}>
            Quick steps: start Hardhat node → open this app → choose a local account → paste an image URL → Mint.
          </div>
        </aside>
      </div>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Marketplace</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {items.length === 0 && (
            <div style={{ padding: 24, borderRadius: 10, background: "#0f0f10", color: "#8a8a8a" }}>No NFTs yet — mint one to start.</div>
          )}
          {items.map(t => {
            const priceEth = t.price && t.price !== "0" ? formatEth(t.price) : null;
            const myOwner = account && t.owner.toLowerCase() === account.toLowerCase();
            return (
              <div key={t.id} style={{ borderRadius: 10, overflow: "hidden", background: "#111", border: "1px solid #222" }}>
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0b" }}>
                  <img src={t.uri} alt={`nft-${t.id}`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Token #{t.id}</div>
                  <div style={{ fontSize: 12, color: "#9b9b9b", marginTop: 6 }}>Owner: {t.owner.slice(0,6)}...{t.owner.slice(-4)}</div>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{priceEth ? `${priceEth} ETH` : "Not listed"}</div>
                  <div style={{ marginTop: 10 }}>
                    {myOwner ? (
                      <>
                        <input value={priceInput} onChange={(e)=>setPriceInput(e.target.value)} placeholder="Price in ETH" style={{ padding: 8, borderRadius: 8, width: "60%", background: "#0d0d0f", color: "#eee", border: "1px solid #222" }} />
                        <button style={{ marginLeft: 8 }} onClick={()=>listToken(t.id)}>List</button>
                      </>
                    ) : priceEth ? (
                      <button onClick={()=>buyToken(t.id, t.price)}>Buy</button>
                    ) : (
                      <small style={{ color: "#888" }}>Not for sale</small>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
