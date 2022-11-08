
# Clovre - Local manga reader

Clovre is a web app with a clean uncluttered interface for reading downloaded manga & webtoons comfortably.

If you find this useful consider [following me](https://twitter.com/rehhouari)!

[Screenshots](https://imgur.com/a/XeLxKGD)

## Features

- Clutter-free responsive interface: every setting have a shortcut.
- Adjustable page width + full screen: no more zooming out!
- Dark mode toggle, accessible interface, and optional audio feedback. 
- [AniList](https://anilist.co) integration to fetch covers & login to set progress etc., without leaving the app.
    - Runs offline, loading covers and AniList login is optional. Offline toggle is provided.

## Usage

Visit: https://clovre.vercel.app

- You can open the help window any time by pressing <kbd>shift</kbd> <kbd>space</kbd>, there you can login to AniList and see shortcuts & toggle them.
- Simply click anywhere to open the directory that have your downloaded mangas (or drag and drop it)
    - Make sure it follow this structure (no subdirectories for source etc.):

[Try downloading this example folder and open it! it doesn't include any copyrighted content](https://github.com/rehhouari/clovre/blob/main/example-folder-structure.zip)

```
Mangas (drop this)/
├── Manga 1/
│   ├── Chapter 1/
│   │   ├── 0.jpg
│   │   ├── 1.jpg
│   │   └── ..
│   └── Chapter 2/
│       ├── page-0.png
│       ├── page-1.png
│       └── ..
└── Manga 2/
    ├── c-4/
    │   ├── image-1.jpg
    │   ├── image-2.jpg
    │   └── ...
    └── c-5/
        ├── 0001.jpg
        └── 0002.jpg
```
> Notice how the folders and images **can** have different naming conventions but what matters is they're all **orderd numerically**s

> I find [Hakuneko](https://github.com/manga-download/hakuneko) the best downloader and the folder structure is compatible with Clovre as well.
  
## Deployment

No build step, use a webserver with **HTTPS support**. like Caddy
<details>
<summary>example Caddyfile</summary>
<code><pre>localhost
root * /path/to/repo/clovre
file_server</pre></code>
</details>
  
## Why

I wanted a way to read manga comfortably on PC because it's been ages. After trying quite a few options, none met my special needs so I put this together over the weekend.

## License

[MIT](https://choosealicense.com/licenses/mit/)


## Tech Stack

**App**: [Alpine.js](https://alpinejs.dev), [Twind](https://twind.dev/).

It uses the new [Filesystem Access API](https://web.dev/file-system-access/) to access files with user permission. (drag & drop doesn't show a prompt if you're annoyed by that)

**API**: Generously provided for free by [AniList.co](https://anilist.co)
