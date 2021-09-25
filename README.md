
# Clovre - Local manga reader

Clovre is a web app with a clean uncluttered interface for reading downloaded manga & webtoons comfortably.

If you find this useful consider [following me](https://rehhouari.bio.link/)!


## Features

- Clutter-free responsive interface: every setting have a shortcut.
- Adjustable page width + full screen: no more zooming out!
- Dark mode toggle, accessible interface, and optional audio feedback. 
- [AniList](https://anilist.co) integration to fetch covers & login to set progress etc., without leaving the app.
    - Runs offline, loading covers and AniList login is optional. Offline toggle is provided.

## Demo

https://clovre.vercel.app

  
## Deployment

No build step, can run anywhere.
  
## Why

I wanted a way to read manga comfortably on PC because it's been ages. After trying quite a few options, none met my special needs so I put this together over the weekend.

## License

[MIT](https://choosealicense.com/licenses/mit/)


## Tech Stack

**App**: [Alpine.js](https://alpinejs.dev), [Twind](https://twind.dev/).

It uses the new [Filesystem Access API](https://web.dev/file-system-access/) to access files with user permission. (drag & drop doesn't show a prompt if you're annoyed by that)

**API**: Generously provided for free by [AniList.co](https://anilist.co)
