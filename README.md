# FindME-Location_Based_Discovery_Platform

# MIIT School Project 


This is a specialized mobile app designed to help people find the best local spots like cafes, salons, and cosmetic shops. Instead of just giving you a random address, it gives you the specific details you actually care about—like if a cafe has a quiet meeting room or what specific beauty treatments a salon offers.

## The Team

* **Min Thu Khaing** (2021-miit-cse-034) 


* **Lin Khant Min Maung** (2021-miit-cse-027) 


* **Phoo Phoo Khaing Thinn** (2021-miit-cse-051) 


* 

* 
**Supervisor:** Dr. Aye Aye Kyaw 



## What It Does

* 
**Smart Discovery:** Uses real-time GPS and the **k-Nearest Neighbors (k-NN)** algorithm to find shops closest to you.


* 
**Detailed Info:** Gives you the scoop on seating capacity, Wi-Fi, pricing, and specialized services.


* 
**Trending & Fresh:** A weighted scoring system shows you what’s popular based on reviews and photos, while the "Newest" filter shows what just opened.


* 
**Social Interaction:** You can follow friends, leave reviews, and upload photos to the "photo booth".



## The Tech Stack

* 
**Frontend:** React Native (Cross-platform mobile) 


* 
**Backend:** Node.js with Express.js 


* 
**Database:** PostgreSQL with **PostGIS** for heavy-duty map math 


* 
**Maps:** OpenStreetMap API 



## How to Get It Running

1. **Clone the repo:** Grab the code from GitHub.
2. 
**Setup Database:** You’ll need a PostgreSQL instance with the PostGIS extension enabled.


3. 
**Install Dependencies:** Run `npm install` in both the frontend and backend folders.


4. 
**Environment Variables:** Create a `.env` file based on the `.env.example` 


5. 
**Start the Engines:** Run the backend server first, then launch the React Native app.


