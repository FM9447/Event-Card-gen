# Google Gemma 4 Event Poster Creator

A self-service custom participation poster generator for Google developer community events (defaulting to the **Gemma 4 Launch Hub** in Kozhikode). Driven by browser-based AI background removal, the application lets attendees generate custom graphics in seconds, while providing organizers with a comprehensive admin dashboard to configure event details, design parameters, and visual branding.

---

## 🚀 Key Features

### 📸 Participant Flow
* **Drag & Drop Upload**: Seamlessly upload portrait or selfie photos.
* **Browser-run AI Background Removal**: Utilizes WebAssembly-powered background removal running entirely locally on the user's device.
* **Interactive Canvas Preview**: Updates in real-time, matching coordinates and styling.
* **High-Res Export**: Generates and downloads **1080 × 1350 px** (Instagram-optimized) PNG posters.

### 🔐 Organizer Dashboard
* **Dynamic Event Configurations**: Customize event names, locations, date/time text, and header logo height.
* **Access Control ownership**: The first organizer to access an unclaimed event slug claims ownership by registering an email and password.
* **Whitelisted Friends**: Creators can invite friends' emails to edit event settings using the event's password.
* **Master Administrator Power**: A master admin account holds universal access to edit configurations, creator emails, and event passwords.
* **Visual & Theme Control**:
  * Upload custom poster templates, page backgrounds, and event info banners.
  * Adjust participant photo cropping shape (Circle vs. Rounded Square), sizes, position coordinates, and rotation (-180° to 180°).
  * Fine-tune page background opacity and theme colors (Primary, Secondary, Dark, and Card Background/Opacity).
  * Remove backgrounds from header and partner logos via integrated AI utility.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS v4, HTML5 Canvas
* **Backend**: Node.js, Express.js
* **Database**: MongoDB (via Mongoose)
* **Cloud Storage**: Cloudinary (for storing templates, backgrounds, banners, and generated posters)
* **Background Removal**: `@imgly/background-removal` (WebAssembly-based local background remover)

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server Port
PORT=3001
NODE_ENV=development

# MongoDB Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/gemma4-events

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📦 Installation & Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/FM9447/Event-Card-gen.git
cd Event-Card-gen
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
Start both the Vite frontend dev server and the Express API server:

```bash
# Start backend server (runs on Port 3001)
npm run server

# Start frontend dev server (runs on Port 5173)
npm run dev
```

### 4. Build for production
```bash
npm run build
```
Vite will compile and output static assets to the `dist/` directory.

---

## 📡 API Endpoints

### Event Config Routes (`/api/config`)
* `GET /api/config/:slug` — Retrieves configuration for a given event slug (creates a default one on first request).
* `POST /api/config/:slug/verify` — Validates credentials for organizer or master admin login.
* `PUT /api/config/:slug` — Saves configuration patches. Requires authorization session payload.
* `DELETE /api/config/:slug/reset` — Resets configuration fields to default values while preserving credentials.

### File Upload Routes (`/api/upload`)
* `POST /api/upload/photo` — Uploads participant raw photo to Cloudinary.
* `POST /api/upload/poster` — Uploads generated poster to Cloudinary and saves details in history.
* `POST /api/upload/template` — Uploads custom canvas background template (requires authorization).
* `POST /api/upload/background` — Uploads custom page background (requires authorization).
* `POST /api/upload/banner` — Uploads custom event info card banner (requires authorization).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.
