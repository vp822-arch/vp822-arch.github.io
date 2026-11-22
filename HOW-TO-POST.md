# Your website: setup and posting

## One-time setup (about 10 minutes)

1. Go to github.com and create a **new public repository** named exactly `vp822-arch.github.io`.
2. On the empty repo page, click **uploading an existing file**.
3. Unzip the website folder. Drag **everything inside it** into the upload box, then click **Commit changes**.
   - The `.pages.yml` file starts with a dot, so Windows may hide it. Make sure it gets uploaded too.
4. In the repo, open **Settings → Pages**. Under "Build and deployment", set the source to **Deploy from a branch** and pick **main** / **(root)**.
5. After about a minute your site is live at **https://vp822-arch.github.io**.

## Posting (every time)

1. Go to **app.pagescms.org** and sign in with GitHub. The first time, approve access to the `vp822-arch.github.io` repo.
2. Open **Posts → Add an entry**.
3. Fill out the form:
   - **Title**, **Date**, **Type** (project or competition)
   - **Event** and **Result** (for competitions)
   - **Summary**: one line that shows on the home page
   - **Cover photo**: drag a photo in
   - **YouTube link**: paste the full URL (best for videos)
   - **Video file**: only for short clips under ~50 MB
   - **Photo gallery**: drag in as many photos as you want. They show up as a strip you can swipe.
   - **Write-up**: the post itself. You can also drop photos straight into the text.
4. Click **Save**. The site updates itself in about a minute.

Editing or deleting a post works the same way in Pages CMS.

## Tips

- Shrink phone photos before uploading. Around 2000 px wide is plenty, and smaller photos load faster.
- Put long videos on YouTube (they can be Unlisted) and paste the link.
- To change your name, tagline or links, edit `_config.yml` on GitHub.
