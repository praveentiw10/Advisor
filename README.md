# Login & Signup Tutorial

A full-stack authentication application with login and signup functionality.

## Features

- User registration (signup)
- User authentication (login)
- Home page with user session management
- MongoDB database integration
- Express.js backend
- Handlebars templating for frontend

## Tech Stack

**Backend:**
- Node.js
- Express.js
- MongoDB
- Mongoose
- bcrypt for password hashing
- express-session for session management

**Frontend:**
- Handlebars (HBS)
- HTML/CSS
- JavaScript

## Project Structure

```
LogInSignUpTutorial/
├── backend/
│   └── src/
│       ├── index.js          # Main server file
│       ├── routes.js         # API routes
│       └── authController.js # Authentication logic
├── frontend/
│   ├── public/               # Static assets (CSS, images, JS)
│   └── views/                # Handlebars templates
└── .gitignore
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/praveentiw10/LogInSignUpTutorial.git
cd LogInSignUpTutorial
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with:
```
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=3000
```

4. Run the application:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

- Navigate to `/signup` to create a new account
- Navigate to `/login` to sign in
- After successful login, you'll be redirected to the home page

## License

MIT
