# ChronosEstimate

ChronosEstimate is an application designed to improve the efficiency and quality of **Agile planning poker sessions**.  
It provides a structured, real-time environment for teams to collaboratively estimate work items located in **Azure DevOps**.

The app is orchestrated following **Domain-Driven Design (DDD)** principles and implemented using **Clean Architecture** and **Hexagonal Architecture (Ports & Adapters)**:

- **Front-end:** Angular 20 (soon 21)
- **Back-end:** AdonisJS (latest version)

---

## 🧑‍⚖️ Roles in ChronosEstimate

### **Chronos Lord**

The host of an estimation session.  
Responsible for:

- Starting and managing sessions
- Selecting Azure DevOps work items
- Revealing votes
- Finalizing estimates

### **Estimators**

Team members who join the session to provide effort estimates.  
The Chronos Lord also participates as an estimator.

---

## 🎯 Purpose of a Session

A session aims to help a team reach **agreement on the effort estimate** for a specific work item (User Story) pulled from Azure DevOps.  
Estimates can be made using:

- **Fibonacci sequence** (1, 2, 3, 5, 8, 13, …)
- **T-shirt sizes** (XS, S, M, L, XL, XXL)

The session continues through multiple work items until the Chronos Lord ends it.

---

# 🧩 End-User Experience

Below is the complete user journey from both perspectives: Chronos Lord and Estimators.

---

## 1. Chronos Lord: Starting a Session

1. Log into ChronosEstimate (organization account).
2. Click **“Start Session”**.
3. A session is created with a unique code or join URL.
4. Invite Estimators by sharing the link or code.

### Technical Notes

- Session lifecycle belongs to the `EstimationSession` domain context.
- Real-time syncing is handled through WebSocket/SSE adapters.

---

## 2. Joining a Session (Estimators)

Estimators:

1. Open the session link or enter the code.
2. Provide a display name.
3. Join the session in real time.

They immediately see:

- List of participants
- Session host (Chronos Lord)
- The currently selected story (once chosen)

---

## 3. Selecting a Work Item (Chronos Lord)

The Chronos Lord uses an **Azure DevOps-powered autocomplete dropdown**.  
It allows searching by:

- Work Item **ID**
- Work Item **Title**

Once selected, the work item appears in a rich UI panel showing:

- Title
- Description
- Acceptance Criteria
- Attachments or links
- Story metadata (tags, priority, etc.)

This view updates for all participants in real time.

---

## 4. Running an Estimation Round

### Step 1: Start estimation

The Chronos Lord clicks **“Start Estimation”**.

### Step 2: Estimators choose a card

Each estimator picks a hidden estimate based on the selected method (Fibonacci or T-shirt size).

The UI shows:

- Vote submitted (only for personal confirmation)
- “Thinking…” indicators for others
- Chronos Lord sees who has voted, but **not** their values

---

## 5. Reveal Phase

Once everyone has voted:

- Chronos Lord clicks **“Reveal”**
- All estimates become visible at once

Participants see:

- A distribution chart
- Outliers highlighted
- Calculated metrics (e.g., mean or median)

This kicks off the **discussion phase**.

---

## 6. Discussion & Re-estimation

If the team isn’t aligned:

- Chronos Lord clicks **“Restart Estimation”**
- Previous votes are cleared
- A new round begins

This may repeat until consensus is reached.

---

## 7. Finalizing the Estimate

After the team agrees:

- Chronos Lord selects **“Accept Estimate”**

This action:

- Saves the final estimate
- (Optional) Writes the estimate back to the Azure DevOps Work Item
- Marks the item as “estimated” within the session context
- Returns the UI to the story selection view

---

## 8. Moving to the Next Work Item

Repeat the cycle:

- Search for next work item
- Review details
- Estimate
- Finalize

---

## 9. Ending the Session

When finished:

- Chronos Lord clicks **“End Session”**

A summary screen may appear showing:

- All estimated stories
- Final estimates per work item
- Number of rounds taken
- Consensus indicators

Participants see a “Session Complete” screen.

---

# 🎨 UX Principles

ChronosEstimate follows Nielsen Norman Group (NN/g) recommended UX guidelines:

### ✔ Visibility of system status

Real-time indicators for presence, votes, and actions.

### ✔ Match with real-world metaphors

Poker-like card UI, familiar terminology.

### ✔ User control & freedom

Session control, restart functionality, undo actions.

### ✔ Efficient & flexible

Keyboard shortcuts (for Chronos Lord), fast ADO search, real-time synchronization.

---

# 🛠 Architecture Highlights

- **DDD** drives domain boundaries (Sessions, Estimators, EstimationRounds, WorkItems).
- **Hexagonal Architecture (Ports & Adapters)** ensures clear separation:
  - Azure DevOps port → ADO adapter
  - Real-time communication port → WebSocket/SSE adapter
  - Persistence port → AdonisJS repository adapter
- **Angular front-end** uses modern reactive primitives (e.g., `rxResource`) to align with clean architecture principles.

---

# 📌 Roadmap (High-Level)

- [ ] Session dashboard
- [ ] Azure DevOps integration (autocomplete, item fetching)
- [ ] Real-time collaboration
- [ ] Estimation rounds
- [ ] Session summary
- [ ] Export/reporting features
- [ ] Team management (optional)

---

## License

GPLv3

---

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

## Google OAuth Setup (Local)

1) Create OAuth client (Web) in Google Cloud:
- Authorized redirect URI: `http://localhost:3333/auth/google/callback`
- Authorized JavaScript origin: `http://localhost:4200`

2) Backend environment (.env):
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3333/auth/google/callback
```

3) Flow:
- Frontend: calls `GET http://localhost:3333/auth/google/url`, then redirects to returned URL.
- Backend: handles callback, creates/updates the user, starts session, redirects to `/dashboard`.