# Parenting Planner

Tools for new parents to organize and coordinate parenting tasks.

## Features

- **Baby Shopping Checklist**: A comprehensive checklist for new parents with categories like sleep & safety, feeding, diapers, clothing, etc.
- **Database Integration**: Connect to a Xano database API to sync data between devices and share with partners
- **Google Sheets Integration**: (Legacy) Connect to a Google Sheet to sync data between devices and share with partners  
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

**Docker/Network Access:** If you need to access the dev server from a different container or network interface, use the network URL shown in the console output (typically `http://10.243.1.132:3000` or similar).

### Build for Production

```bash
# Build static site
npm run build
```

The built site will be in the `dist/` directory.

## Deployment

This project is configured to deploy to GitHub Pages automatically when you push to the `main` branch.

To set up GitHub Pages deployment:
1. Go to your repository settings
2. Navigate to Pages
3. Set Source to "GitHub Actions"

## API Integration

### Database API (Recommended)

The application can connect to a Xano database API for persistent data storage and synchronization.

**Base URL:** `https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF`

**Authentication:** None required

**Available Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shopping_item` | Get all shopping items |
| POST | `/shopping_item` | Create new shopping item |
| GET | `/shopping_item/{id}` | Get specific shopping item |
| PATCH | `/shopping_item/{id}` | Update shopping item |
| DELETE | `/shopping_item/{id}` | Delete shopping item |

**Shopping Item Schema:**
```json
{
  "id": "number",
  "created_at": "datetime",
  "user": "string",
  "name": "string",
  "description": "string",
  "priority": "enum: low|medium|high",
  "source_url": "string",
  "status": "enum: pending|purchased|not needed",
  "cost": "number",
  "notes": "string",
  "category": "string"
}
```

**Example Usage:**
```javascript
// Get all items
const response = await fetch('https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF/shopping_item');
const items = await response.json();

// Create new item
const newItem = {
  name: "Crib with firm mattress",
  description: "Essential sleep furniture",
  priority: "high",
  status: "pending",
  category: "Sleep & Safety",
  notes: "Brand, model, condition..."
};

await fetch('https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF/shopping_item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newItem)
});
```

## Future Features

- More parenting tools and checklists
- Calendar integration for appointments
- Meal planning for families
- Milestone tracking

## Contributing

This is primarily a personal project, but suggestions and improvements are welcome!