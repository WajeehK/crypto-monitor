# Crypto Trader monitor

A static, installable web app (PWA) that shows the positions and trades of a paper-trading bot.

- The bot's data is pushed to the `data` branch **AES-256-GCM encrypted**. The key is never in this repo; it only lives on the bot's machine and in the owner's personal link (URL fragment, which browsers never send to servers).
- Live prices, candles and unrealised P&L are computed in the browser from Kraken's public market data.
- Chart library: TradingView Lightweight Charts (Apache-2.0). Coin icons: @web3icons/core (MIT) and cryptocurrency-icons (CC0) — see `coins/CREDITS.txt`.
