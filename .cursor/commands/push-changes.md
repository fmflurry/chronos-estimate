---
description: Commit and push changes
---

0. **NEVER** commit untracked markdown
1. Analyze current changes
2. Using conventional commit specifications below to create a commit with meaningful and brief description
3. If you can't commit because eslint or tests failure, stop and ask for my input
4. Push changes to the remote branch

Conventional commit specification :

<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]

• Type: Specifies the purpose of the change.
• feat: A new feature.
• fix: A bug fix.
• docs: Documentation only changes.
• style: Changes that do not affect the meaning of the code (e.g., formatting).
• refactor: Code changes that neither fix a bug nor add a feature.
• test: Adding or correcting tests.
• chore: Maintenance tasks (e.g., updating build scripts).

• Scope (optional): Identifies the area of the project affected (e.g., auth, api).
• Short Summary: A concise description of the change (in present tense).

Examples:
• feat(api): add user authentication endpoint

---

Branch naming

<type>/<scope>-<short-description>

Examples:
• feat/auth-login-form
