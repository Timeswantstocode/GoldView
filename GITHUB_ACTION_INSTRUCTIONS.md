# Secure Price Notifications Setup

I have prepared the logic for automated and secure manual notifications. However, due to GitHub's security policies, I cannot directly push new workflow files (`.github/workflows/*.yml`) from this environment.

Please follow these steps to complete the setup:

### 1. Create the Notification Workflow
Create a new file in your repository at `.github/workflows/notify_prices.yml` and paste the following content. This workflow is restricted so that **only you** (the repository owner) can trigger it manually.

```yaml
name: Send Price Notifications

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for manual trigger'
        required: false
        default: 'Manual update'

jobs:
  notify:
    runs-on: ubuntu-latest
    # Security: Only allow the repository owner to trigger this manually
    if: github.event_name == 'workflow_dispatch' && github.actor == github.repository_owner
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install pywebpush requests beautifulsoup4

      - name: Send Notifications
        env:
          VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIVATE_KEY }}
          VAPID_PUBLIC_KEY: ${{ secrets.VAPID_PUBLIC_KEY }}
          VAPID_EMAIL: ${{ secrets.VAPID_EMAIL }}
        run: |
          python -c "from scraper import send_push_notification; import json; f=open('data.json'); d=json.load(f); cur=d[-1]; prev=d[-2] if len(d)>1 else cur; send_push_notification(cur['gold'], cur.get('tejabi', 0), cur['silver'], cur['gold']-prev['gold'], cur.get('tejabi',0)-prev.get('tejabi',0), cur['silver']-prev['silver'])"
```

### 2. Automated Notifications
I have updated `scraper.py` to automatically trigger notifications whenever a price change is detected during the scheduled scrape. You don't need to do anything else for this—it will work as soon as the next `scrape.yml` run completes.

### 3. Ensure Secrets are Set
Make sure the following secrets are added to your GitHub repository (**Settings > Secrets and variables > Actions**):
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_EMAIL`

### 4. Spam Protection
I have updated the notification logic to use dynamic tags. This ensures that Android and Chrome see each update as a new event, preventing them from being grouped or flagged as spam.
