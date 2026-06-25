# Contributing to Poster Gen

Thank you for your interest in contributing to Poster Gen! Contributions from the community help make this tool better for everyone. 

This document outlines the guidelines and workflow for contributing to this project.

---

## 📋 Table of Contents
- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Local Development Setup](#-local-development-setup)
- [Coding Guidelines](#-coding-guidelines)
- [Commit Message Conventions](#-commit-message-conventions)

---

## 🤝 Code of Conduct

By participating in this project, you agree to abide by the terms of our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

---

## 💡 How Can I Contribute?

### Reporting Bugs
If you find a bug, please create a new issue on GitHub. Before creating an issue, search the existing issues to see if it has already been reported.
When reporting a bug, please include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected vs. actual behavior.
- Screenshots or GIFs if applicable.
- Your environment details (OS, browser name, node version).

### Suggesting Enhancements
If you have ideas to improve the application, feel free to open a feature request issue. Please include:
- A clear description of the proposed feature.
- The problem it solves or value it adds.
- Any mockups or design ideas.

### Submitting Pull Requests
1. Fork the repository and create your branch from `main`.
2. Ensure you have the latest code from `main`.
3. If you've added code that should be tested, add tests.
4. Update the documentation if you modified features or user interfaces.
5. Make sure the code builds cleanly (`npm run build`).
6. Format and lint your code (`npm run lint`).
7. Open the Pull Request, linking the issue you are fixing.

---

## 💻 Local Development Setup

Refer to the [README.md](README.md) for environment variables and prerequisites.

1. **Fork the repo** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Event-Card-gen.git
   cd Event-Card-gen
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a `.env` file** in the root folder with your MongoDB, port, and Cloudinary credentials.
5. **Start the development servers**:
   ```bash
   npm run dev
   ```

---

## 🎨 Coding Guidelines

- **Javascript/ES6**: Use modern JS constructs, async/await, and arrow functions where appropriate.
- **React Components**: Keep components functional and declare hooks at the top. Ensure state is hoisted appropriately.
- **Styling**: We use Tailwind CSS. Follow consistent spacing, responsive utilities, and clean layouts.
- **Accessibility**: Make sure forms have proper labels, buttons have descriptive text/aria-labels, and contrast is readable.

---

## 📝 Commit Message Conventions

We recommend using semantic/conventional commit messages to keep history clean and readable:

- `feat: ...` for a new feature.
- `fix: ...` for a bug fix.
- `docs: ...` for documentation changes.
- `style: ...` for visual styling changes, formatting, or missing semi-colons.
- `refactor: ...` for restructuring code without changing features.
- `chore: ...` for updating dependencies, build tools, etc.
