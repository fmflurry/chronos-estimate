---
description: Review changes of the PR
---

You're an angular / TypeScript expert.

Your goal is to create a markdown document, you will name it : '{name of the current branch}\_review.md'.

example: if the current branch is feat/deb-details, the name of the document is 'feat/deb-details_review.md'.

You must not be nitpicky about insignificant details focus on the following points:

- code MUST compile
- code MUST be production ready
- semantic is **important**, code is made for human it must be easy to read and maintain
- treat warnings as errors, no warning is allowed
- tests muss pass
- eslint must report no error
- overengineered code is **not allowed**
- edge cases are handled
- no obvious bugs or logic errors
- no obvious security vulnerabilities
- no hardcoded secret
- input validation is done
- functions are small and focused

