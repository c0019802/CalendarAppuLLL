Schedule+
Overview

Schedule+ is a web-based scheduling application built using Node.js and Express.
It enables users to work together via shared group schedules in addition to managing their own personal plans.

In addition to creating profiles, users may securely log in, manage personal events, join shared groups, RSVP for group events, and manage group members and events if they are group administrators.

In order to illustrate database usage, authentication, role-based access control, and backend web development, this project was created as part of a university coursework assignment.

Features
User Accounts
•	Register a new account
•	Login and logout
•	Forgot password using a one-time verification code
•	Passwords securely hashed using bcrypt
•	Session-based authentication
Personal Schedule
•	View Today’s Events
•	View Upcoming Events
•	Create new personal events
•	Events stored and retrieved from an SQLite database
Shared Group Schedules
•	View all groups the user belongs to
•	Create a new group (creator becomes admin)
•	View upcoming group events
•	Add new group events
•	RSVP to group events:
o	Going
o	Maybe
o	Can’t attend
Group Admin Capabilities
•	Add members to a group by email
•	Remove members from a group
•	Edit group events
•	Cancel group events
•	Delete group events
•	Delete an entire group
RSVP Management
•	Group members can RSVP to events
•	Group admins can view all RSVPs per event
•	RSVP counts (Yes / Maybe / No) are displayed clearly
schedule-plus/
│
├── app.js
├── db.js
├── schema.sql
├── package.json
├── data.sqlite
├── sessions.sqlite
│
├── routes/
│   ├── auth.js
│   ├── schedules.js
│   └── groups.js
│
├── views/
│   ├── layout.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── forgot.ejs
│   ├── my-schedule.ejs
│   ├── shared-schedules.ejs
│   ├── create-group.ejs
│   └── edit-group-event.ejs
│
└── public/
    └── styles.css
Installation & Setup
Prerequisites
•	Node.js 
•	npm
Installation Steps
Clone the repository
git clone <repository-url>

Navigate to project directory
cd schedule-plus

Install dependencies
npm install

Start the application
npm start
Access the App
http://localhost:3000

How to Use the Application
Register & Login
1.	Navigate to /register to create an account
2.	Login via /login
3.	After login, users are redirected to My Schedule
My Schedule
•	View today’s and upcoming personal events
•	Create new personal events using the form
Shared Schedules
•	Navigate to the Shared Schedules tab
•	Create a new group
•	Add members by email
•	Create group events
•	RSVP to group events
Admin Usage
•	The group creator is automatically assigned the admin role
•	Admins can manage members, events, and delete groups
Author
•	Name: Lubna Ibdali / Lydia Davidson / MohammedAmin Abdi
•	Student Numbers: c0019802 / c4024166 / C0009097
•	Course: Software Engineering
•	Institution: Sheffield Hallam University
