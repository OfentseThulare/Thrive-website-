# Thrive Through Cancer

The first production ready website build for Thrive Through Cancer, a division of Inheritance Academy.

## Local preview

Run a static web server from the project root:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Architecture

The site is deliberately dependency free. It uses semantic HTML, modern CSS and a small progressive JavaScript layer. It can be hosted on Vercel, Netlify, GitHub Pages or any conventional web host.

## Production integrations still required

The booking interface is complete, but it does not transmit personal information until a secure form endpoint and the client's public contact details are supplied. PayFast, card and EFT choices are represented in the booking journey without exposing or inventing payment credentials.

Before launch, connect:

* a booking or secure form endpoint
* PayFast merchant details
* EFT instructions
* a privacy policy and cancellation policy
* approved certification logos
* final source references for medical statistics

## Design documentation

The approved design and implementation plan are in `docs/plans`.
