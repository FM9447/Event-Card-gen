# Poster Gen - Custom Event Poster Creator

A self-service custom participation poster generator for developer community events. Built on a modular React/Node architecture, it features browser-based WebAssembly AI background removal, an offloadable server-side background removal microservice, and a comprehensive admin/organizer dashboard to configure event details, design coordinates, multiple custom templates with keywords, and theme branding.

---

## 🚀 Key Features

### 📸 Participant Flow
* **Drag & Drop Upload**: Seamlessly upload portrait or selfie photos.
* **AI Background Removal**: Local in-browser WebAssembly background removal running entirely on the user's device, with a robust fallback chain (Client-side WASM -> Azure Microservice -> Main Backend).
* **Role / Template Selection**: Choose custom templates based on keywords (e.g. "Speaker", "Attendee", "Volunteer", "Organizer") from a dynamic dropdown before generating the poster.
* **Interactive Canvas Preview**: Updates in real-time, matching coordinates and styling.
* **High-Res Export**: Generates and downloads **1080 × 1350 px** (Instagram-optimized) PNG posters.

### 🔐 Organizer Dashboard
* **Dynamic Event Configurations**: Customize event names, locations, date/time text, and header logo height.
* **Access Control & Ownership**: The first organizer to access an unclaimed event slug claims ownership by registering an email and password.
* **Whitelisted Editors**: Creators can invite friend/editor emails to edit event settings using the event's password.
* **Master Administrator Power**: A master admin account holds universal access to edit configurations, creator emails, and event passwords.
* **Visual & Theme Control**:
  * Upload custom poster templates, page backgrounds, and event info banners.
  * Adjust participant photo cropping shape (Circle vs. Rounded Square), sizes, position coordinates, and rotation (-180° to 180°).
  * Fine-tune page background opacity and theme colors (Primary, Secondary, Dark, and Card Background/Opacity).
  * Remove backgrounds from header and partner logos via integrated AI utility.
* **Multiple Custom Templates**: Upload and associate multiple templates with custom keywords (e.g., "Speaker", "Attendee") so participants can select their roles.
* **Hardened Security & API Privacy**: Credentials are automatically scrubbed from database query serializations before sending responses to the client, and logout clears all global and local storage session tokens to prevent auto-login on refresh.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS v4, HTML5 Canvas
* **Backend**: Node.js, Express.js
* **Database**: MongoDB (via Mongoose)
* **Cloud Storage**: Cloudinary (for storing templates, backgrounds, banners, and generated posters)
* **Background Removal**: `@imgly/background-removal` (WebAssembly-based local background remover) & Express-based background removal microservice.

---

## 📂 Project Structure

```
├── event-poster-gen/         # Main application directory
│   ├── server/               # Express.js backend (API routes, database connection, schemas)
│   ├── src/                  # React.js frontend (components, hooks, utilities, styling)
│   └── azure-bg-remover/     # Optional standalone background removal microservice
```

### Background Removal Microservice (`azure-bg-remover`)
Because background removal models run ONNX neural networks that take significant CPU and memory, running them on free-tier platforms can cause memory crashes. The `azure-bg-remover` is a standalone Node.js Express service featuring a `POST /remove-bg` endpoint. It is designed to be hosted on cloud providers (like Azure App Service) to keep the main application fast, stable, and lightweight.

---

## ⚙️ Environment Variables

Create a `.env` file in the root `event-poster-gen` directory:

```env
# Server Port
PORT=3001
NODE_ENV=development

# MongoDB Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/events

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# (Optional) Standalone Background Remover Service URL
VITE_AZURE_BG_REMOVER_URL=https://your-bg-remover-url.azurewebsites.net/remove-bg
```

---

## 📦 Installation & Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/FM9447/Event-Card-gen.git event-poster-gen
cd event-poster-gen
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

## 📄 License & Community Guidelines

- **License**: Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.
- **Contributing**: Contributions are welcome! Refer to [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and guidelines.
- **Code of Conduct**: We expect all participants to adhere to the standard [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Security**: For reporting vulnerability issues, refer to [SECURITY.md](SECURITY.md).
