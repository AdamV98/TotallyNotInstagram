# TotallyNotInstagram

A simple Instagram-like application with a Node.js/Express backend and an Angular frontend.

---

## Prerequisites

- **Node.js** (v16+ recommended)
- **npm** (comes with Node.js)
- **Angular CLI** (install globally with `npm install -g @angular/cli`)
- **MongoDB** (running locally)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd TotallyNotInstagram
```

---

### 2. Start the Backend

```bash
cd backend
npm install
```

- Create a `.env` file in the `backend` directory if needed (see `.env.example` if present).
- Make sure MongoDB is running and the connection string in `.env` is correct.

```bash
npm run dev
```
or
```bash
npm start
```

The backend should now be running on [http://localhost:5000](http://localhost:5000).

---

### 3. Start the Frontend

Open a new terminal window/tab:

```bash
cd frontend
npm install
ng serve
```

The frontend will be available at [http://localhost:4200](http://localhost:4200).

---

## Default URLs

- **Frontend:** [http://localhost:4200](http://localhost:4200)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)

---

## Initializing the Database

If you want to start with some initial data, a MongoDB dump is provided in the repository.

### Import the Initial Database

You can import the provided dump using the following commands (MongoDB Command Line Database Tools needs to be installed on system):

```bash
mongorestore --db instagram_db ./instagram_db_export/instagram_db
```

- Make sure MongoDB is running before running this command.
- This will populate your database with initial users, posts, and other data.

### Passwords for test users

- admin@test.com: "admin"
- admin2@test.com: "admin"
- test@test.com: "password123"
- new@test.com: "pass"
- reg@test.com: "reg"

---

## Notes

- Ensure MongoDB is running before starting the backend.
- The backend uses cookies for authentication; make sure your browser accepts them.
- If you change backend ports, update the frontend API URLs accordingly.

---

## Troubleshooting

- If you get CORS errors, check backend CORS settings.
- If you get MongoDB connection errors, check your `.env` and MongoDB status.
- For other issues, check the terminal output for error messages.

---