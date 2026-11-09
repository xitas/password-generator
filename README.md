# Password Generator

A password and passphrase generator built with plain HTML, CSS and JavaScript. No frameworks, no build step, and nothing leaves your browser.

**Live demo:** [https://xitas.github.io/password-generator/](https://xitas.github.io/password-generator/)

## Features

- **Two modes:** random passwords and word-based passphrases
- **Password options:** length from 8 to 64, uppercase, lowercase, numbers and symbols, a custom symbol list, and an option to leave out look-alike characters (`I`, `l`, `1`, `O`, `0`)
- **Passphrase options:** 3 to 10 words, choice of separator, capitalized words and an optional number
- **Strength meter** with estimated entropy in bits and an estimated time to crack
- **Color-coded output:** letters, numbers and symbols are easy to tell apart
- **Copy** with one click, and **Hide** the result when someone is looking over your shoulder
- Every selected character type is guaranteed to appear in the password
- Remembers your settings (never the passwords)
- **Light and dark** themes that follow your system setting

## Project structure

```
.
├── index.html   # Page markup
├── style.css    # Styles
├── script.js    # Generation, strength estimate and UI
└── README.md
```

## Getting started

No installation needed. You can use the [live demo](https://xitas.github.io/password-generator/) or run it locally.

1. Clone the repository:
   ```bash
   git clone https://github.com/xitas/password-generator.git
   cd password-generator
   ```
2. Open `index.html` in your browser.

Optionally, serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## How it works

- Random numbers come from `crypto.getRandomValues`, the browser's secure random number generator. `Math.random` is never used.
- Picking a character or word uses rejection sampling, so every option is equally likely and there is no modulo bias.
- A password takes one character from each chosen type, fills the rest from all chosen types, and then shuffles the result with a Fisher-Yates shuffle.
- Entropy is `length × log2(number of possible characters)` for passwords, and `words × log2(word list size)` for passphrases, plus about 6.6 bits when a number is added.
- Time to crack assumes an attacker making 10 billion guesses per second and finding the password after searching half of all possibilities. It is a rough guide, not a guarantee.

## Notes

- The passphrase word list has a few hundred words (about 9 bits per word), so a passphrase needs more words than you might expect. Use 6 or more for important accounts.
- Because every chosen type must appear, the real entropy is very slightly lower than the estimate shown.
- Passwords are only kept in memory while the page is open. Only your settings are saved in `localStorage`.
- If **Copy** is blocked when the page is opened as a local file, the page selects the text so you can press `Ctrl/Cmd + C`.

## Deploy with GitHub Pages

1. Push the project to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Your site will be live at `https://xitas.github.io/password-generator/`.

## License

Add a license of your choice (for example MIT) in a `LICENSE` file.