# Talent Scout AI

Build a web app called "Intern Screener". The user pastes a GitHub username and optional social/portfolio links. The app fetches the user's public GitHub profile and repositories using the GitHub public API (name, description, language, stars, last updated). It then sends this data to an AI model and asks it to score the applicant from 0 to 10 on these 6 criteria: 1) Open-source AI & models (LoRAs, fine-tuning), 2) AI content creation (audio/video), 3) Automation & architecture (social media APIs, MCP, workflows), 4) Social media & content strategy, 5) AI-assisted coding & deployment, 6) Cybersecurity. Show each score as a bar, an overall score, a 3-line summary, and "strongest signal" and "missing" sections. Clean, modern design. Include an "Example" button that loads a sample profile.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://github-scorecard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97ba19a2-5fed-4c09-9592-043eb3707746).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
