# Make the deployment automation script executable by your local terminal system
chmod +x deploy.sh

# Track all new folders and script items
git add src/ script/ deploy.sh

# Commit the code architecture update cleanly
git commit -m "feat: add implementation contract and bash automation deploy script"

# Push the changes straight up to the main branch on your remote GitHub repository
git push origin main
