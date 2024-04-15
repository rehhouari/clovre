let main = function () {
	return {
		loaded: false,
		mangas: [],
		chapters: [],
		pages: { images: [], sizes: [] },
		selectedManga: null,
		selectedMangaData: null,
		selectedChapter: null,
		searchMangas: '',
		searchChapters: '',
		chaptersOrderDescending: this.$persist(true),
		orderButtonLabel() {
			if (this.chaptersOrderDescending) {
				return 'Descending Order'
			} else {
				return 'Ascending Order'
			}
		},
		loading: '',
		showUpdateBar: false,
		clickToLoad: false,
		loadedImages: 0,
		dragover: false,
		pageSize: this.$persist(0),
		darkMode: this.$persist(false),
		mangasHandle: null,
		chaptersHandle: null,
		persistedData: this.$persist(Object.create(null)),
		dev: location.hostname == 'localhost',
		authUrl: '',
		graphqlUrl: 'https://graphql.anilist.co',
		audio: null,
		muteAudio: false,
		openMenu: false,
		menuTab: 2,
		firstStart: this.$persist(true),
		accessToken: this.$persist(''),
		loginInterval: null,
		loginSeconds: 0,
		maxLoginSeconds: 60,
		mangaStatusFilter: 'any',
		offlineMode: this.$persist(false),
		username: this.$persist(''),
		hitCounted: this.$persist(false),
		init() {
			this.authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${this.dev ? '6595' : '6586'}&response_type=token`
			if (document.location.hash.startsWith('#access_token=')) {
				this.accessToken = document.location.hash.match(/\#(?:access_token)\=([\S\s]*?)\&/)[1];
				window.close()
			}
			window.addEventListener('popstate', function (event) {
				event.preventDefault()
				history.pushState(null, null, window.location.pathname)
				this.escape()
			})
			history.pushState(null, null, window.location.pathname)
			this.audio = { on: new Audio(), off: new Audio() }
			this.audio.on.src = "/audio/on.ogg"
			this.audio.off.src = "/audio/off.ogg"
			this.initSW()
			if (this.firstStart) {
				this.openMenu = true
				this.firstStart = false
			}
			if (window.navigator.onLine && !this.hitCounted) {
				fetch('https://api.countapi.xyz/hit/clovre.vercel.app/visits')
				this.hitCounted = true
			}
		},
		initSW() {
			this.newWorker = null
			let refreshing
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker
					.register('/sw.js')
					.then((registration) => {
						console.log(
							'ServiceWorker registration successful with scope: ',
							registration.scope
						);
						registration.addEventListener('updatefound', function () {
							// A wild service worker has appeared in reg.installing!
							this.newWorker = registration.installing;

							this.newWorker.addEventListener('statechange', function () {
								// Has network.state changed?
								switch (this.newWorker.state) {
									case 'installed':
										if (navigator.serviceWorker.controller) {
											// new update available
											this.showUpdateBar = true
										}
										// No update available
										break;
								}
							}.bind(this));
						}.bind(this));
					})
					.catch(function (err) {
						console.log('ServiceWorker registration failed: ', err);
					});

			}
			navigator.serviceWorker.addEventListener('controllerchange', function () {
				if (refreshing) return;
				window.location.reload();
				refreshing = true;
			});

		},
		login() {
			this.loading = 'login'
			this.username = ''
			this.loginInterval = setInterval(this.checkToken.bind(this), 1000);
		},
		async checkToken() {
			let t = JSON.parse(localStorage._x_accessToken)
			if (t != '') {
				this.accessToken = t
				let data = await this.request(true, queries.username)
				if (data != null) {
					this.username = data.Viewer.name
				}
				clearInterval(this.loginInterval)
				this.loginSeconds = 0
				if (this.loaded)
					await this.refreshData()
				this.loading = ''
			} else {
				this.loginSeconds += 1
				if (this.loginSeconds > this.maxLoginSeconds) {
					clearInterval(this.loginInterval)
					this.loginSeconds = 0
					this.loading = ''
				}
			}
		},
		logout() {
			this.accessToken = ''
			this.username = ''
		},
		toggle(what) {
			if (this.loading) return
			this[what] = !this[what]
			if (this[what] == false) this.playOff()
			else this.playOn()
		},
		setPageWidth(width) {
			this.pageSize = width
			this.playOn()
		},
		playOn() {
			if (!this.muteAudio)
				this.audio.on.play()
		},
		playOff() {
			if (!this.muteAudio)
				this.audio.off.play()
		},
		async openMangasDir() {
			try {
				this.mangasHandle = await window.showDirectoryPicker();
				this.loading = 'mangas'
				this.handleMangaDir()
			} catch (err) {
				console.error(err)
				this.loading = ''
			}
		},
		async handleMangaDir() {
			this.chaptersHandle = null
			this.mangas = []
			for await (const entry of this.mangasHandle.values()) {
				if (entry.kind == 'directory') {
					let id = Math.floor(Math.random() * (1000000 - 500000) + 500000)
					let coverImage = null
					let favorited = false
					let status = null
					let chapters = 1000
					if (!this.persistedData[this.mangasHandle.name]) {
						this.persistedData[this.mangasHandle.name] = []
					}
					let index = this.persistedData[this.mangasHandle.name].findIndex((e) => e.name == entry.name)
					if (index != -1) {
						id = this.persistedData[this.mangasHandle.name][index].id
						coverImage = this.persistedData[this.mangasHandle.name][index].coverImage
						favorited = this.persistedData[this.mangasHandle.name][index].favorited
						chapters = this.persistedData[this.mangasHandle.name][index].chapters
						status = this.persistedData[this.mangasHandle.name][index].status
					} else {
						if (window.navigator.onLine && !this.offlineMode) {
							let data = await anilistSearch(entry.name)
							if (data != null) {
								id = data.id
								coverImage = await toDataURL(data.coverImage.large)
								chapters = data.chapters
								if (this.accessToken) {
									let f = await this.isFavorited(id)
									if (f != null) favorited = f
									let statusData = await this.request(true, queries.status, { id: id })
									status = statusData?.Media?.mediaListEntry ?? { id: null, status: null, progress: 0 }
									if (status.status) status.index = Object.keys(mangaStatus).indexOf(status.status)
									else status.index = 0
								}
								this.persistedData[this.mangasHandle.name].push({ name: entry.name, id: id, coverImage: coverImage, chapters: chapters, favorited: favorited, status: status })
							}
						}
					}
					let mangaObject = { name: entry.name, id: id, coverImage: coverImage, chapters: chapters, favorited: favorited, status: status }
					this.mangas.push(mangaObject)
				}
			}
			this.loaded = true
			document.title = `Browse | Clovre`
			this.loading = ''
		},
		getMangas() {
			let m = this.mangas.filter((e) => e.name.toLowerCase().replace(' ', '').trim().includes(this.searchMangas.toLowerCase().replace(' ', '').trim()))
			if (this.mangaStatusFilter != 'any')
				return m.filter((e) => e.status.status == this.mangaStatusFilter || (e.status.status == null && this.mangaStatusFilter == 'null'))
			return m
		},
		getChapters() {
			const collator = new Intl.Collator([], {numeric: true});
			let res = this.chapters.filter((e) => e.toLowerCase().replace(' ', '').trim().includes(this.searchChapters.toLowerCase().replace(' ', '').trim())).sort(collator.compare)
			if (this.chaptersOrderDescending) {
				return res
			} else {
				return res.reverse()
			}
		},
		async selectManga(name) {
			this.loading = 'manga'
			this.chapters = []
			this.chaptersHandle = await this.mangasHandle.getDirectoryHandle(name, { create: false })
			for await (const chapter of this.chaptersHandle.values()) {
				if (chapter.kind == 'directory') {
					this.chapters.push(chapter.name)
				}
			}
			const collator = new Intl.Collator([], {numeric: true});
			this.chapters = this.chapters.sort(collator.compare)
			this.selectedMangaData = this.mangas[this.mangas.findIndex((e) => e.name == name)]
			document.title = name + " | Clovre"
			this.selectedManga = name
			this.loading = ''
		},
		async selectChapter(name) {
			this.loading = 'chapter'
			this.loadedImages = 0
			this.pages = { images: [], sizes: [] }
			let pagesHandle = await this.chaptersHandle.getDirectoryHandle(name, { create: false })
			let total = 0
			let processed = 0
			for await (const page of pagesHandle.values()) {
				if (page.kind == 'file') total += 1
			}

			for await (const page of pagesHandle.values()) {
				if (page.kind == 'file') {
					let fh = await pagesHandle.getFileHandle(page.name, { create: false })
					let file = await fh.getFile()
					let reader = new FileReader()
					reader.onload = (event) => {
						let id = page.name.replace('.jpg', '').replace('.png', '').replace('.webp', '').replace('.jpeg', '').replace('-image', '').replaceAll("[^\\d.]", '') / 1
						this.pages.images[id] = event.target.result
						let image = new Image();
						image.src = event.target.result;
						image.onload = () => {
							this.pages.sizes[id] = { width: image.width, height: image.height }
							processed++
							if (processed == total) {
								this.pages.images = this.pages.images.filter(e => e)
								this.pages.sizes = this.pages.sizes.filter(e => e)
								this.loading = ''
							}
						}

					}
					await reader.readAsDataURL(file);
				}
			}
			document.title = `${name} - ${this.selectedManga}  | Clovre`
			this.selectedChapter = name
		},
		nextChapter() {
			let currentIndex = this.chapters.findIndex((e) => e == this.selectedChapter)
			if (currentIndex == this.chapters.length - 1) {
				this.playOff()
				return
			} else {
				this.selectChapter(this.chapters[currentIndex + 1])
				this.playOn()
			}
		},
		previousChapter() {
			let currentIndex = this.chapters.findIndex((e) => e == this.selectedChapter)
			if (currentIndex == 0) {
				this.playOff()
			} else {
				this.selectChapter(this.chapters[currentIndex - 1])
				this.playOn()
			}
		},
		async isFavorited(id) {
			let data = await this.request(true, queries.favorited, { id: id })
			return data?.Media?.isFavourite
		},
		async favoriteToggle() {
			let data = await this.request(true, queries.favorite, { "mangaId": this.selectedMangaData.id })
			if (await data != null) {
				this.playOn()
				let f = await this.isFavorited(this.selectedMangaData.id)
				if (f != null) {
					this.selectedMangaData.favorited = f
					let i = this.persistedData[this.mangasHandle.name].findIndex((e) => e.name == this.selectedManga)
					this.persistedData[this.mangasHandle.name][i].favorited = f
				}
			}
		},
		async setStatus(status) {
			if (status == 'null') {
				let data = await this.request(true, queries.deleteStatus, { id: this.selectedMangaData.status.id })
				if (data?.DeleteMediaListEntry?.deleted) {
					this.playOn()
					this.selectedMangaData.status.status = status
					this.selectedMangaData.status.index = Object.keys(mangaStatus).indexOf(status)
					this.selectedMangaData.status.id = null
					this.persistedData[this.mangasHandle.name][this.persistedData[this.mangasHandle.name].findIndex((e) => e.name == this.selectedMangaData.name)].status = this.selectedMangaData.status
				} else {
					alert('Error deleting status')
				}
			} else {
				let data = await this.request(true, queries.setStatus, { mediaId: this.selectedMangaData.id, status: status })
				if (data?.SaveMediaListEntry?.status != status) {
					alert('Error setting status')
				} else {
					this.playOn()
					this.selectedMangaData.status.id = data?.SaveMediaListEntry?.id
					this.persistedData[this.mangasHandle.name][this.persistedData[this.mangasHandle.name].findIndex((e) => e.name == this.selectedMangaData.name)].status = this.selectedMangaData.status
				}
			}
		},
		async setProgress(value) {
			let data = await this.request(true, queries.setProgress, { mediaId: this.selectedMangaData.id, progress: value })
			if (data?.SaveMediaListEntry?.progress != value) {
				alert('Error setting progress')
			} else {
				this.playOn()
				this.selectedMangaData.status.progress = value
				this.selectedMangaData.status.id = data?.SaveMediaListEntry?.id
				this.persistedData[this.mangasHandle.name][this.persistedData[this.mangasHandle.name].findIndex((e) => e.name == this.selectedMangaData.name)].status = this.selectedMangaData.status
			}
		},
		// refresh Anilist data of the currently selected manga
		async refreshManga(mangaData) {
			this.loading = 'manga'
			let index = this.persistedData[this.mangasHandle.name].findIndex((e) => e.id == mangaData.id)
			if (index == -1 || !mangaData.coverImage) {
				let mangaObject = this.loadMangaDataFromAnilist(mangaData.name)
				this.persistedData[this.mangasHandle.name].push(mangaObject)
				this.mangas[this.mangas.findIndex((e) => e.id == mangaData.id)] = mangaObject
			} else {
				if (this.accessToken) {
					let favorited = await this.isFavorited(mangaData.id) ?? mangaData.favorited
					let statusData = await this.request(true, queries.status, { id: mangaData.id })
					let status = statusData.Media?.mediaListEntry
					if (!status) {
						status = { index: 0 }
					} else {
						console.log('regular status:', status)
						if (status.status) status.index = Object.keys(mangaStatus).indexOf(status.status)
						else status.index = 0
					}
					this.persistedData[this.mangasHandle.name][index].favorited = favorited
					this.persistedData[this.mangasHandle.name][index].status = status
					mangaData.status = status
					mangaData.favorited = favorited
				}
				let chaptersData = await this.request(false, queries.chapters, { id: mangaData.id })
				let chapters = chaptersData?.Media?.chapters ?? mangaData.chapters
				this.persistedData[this.mangasHandle.name][index].chapters = chapters
				mangaData.chapters = chapters
			}
			this.selectedMangaData = this.mangas[this.mangas.findIndex((e) => e.name == mangaData.name)]
			this.loading = ''

		},
		async refreshData() {
			this.loading = 'mangas'
			this.selectedChapter = null
			this.selectedManga = null
			this.mangas = []
			this.persistedData[this.mangasHandle.name] = []
			for await (const entry of this.mangasHandle.values()) {
				if (entry.kind == 'directory' && window.navigator.onLine) {
					let mangaData = await this.loadMangaDataFromAnilist(entry.name)
					if (!mangaData) {
						let id = Math.floor(Math.random() * (1000000 - 500000) + 500000)
						let coverImage = null
						mangaData = { id: id, coverImage: coverImage, name: entry.name }
					}
					let i = this.mangas.push(mangaData)
					this.selectedMangaData = this.mangas[i - 1]
					this.persistedData[this.mangasHandle.name].push(mangaData)
				}
			}
			this.loading = ''
		},
		async loadMangaDataFromAnilist(name) {
			let data = await anilistSearch(name)
			if (data != null) {
				let id = data.id
				let coverImage = await toDataURL(data.coverImage.large)
				let chapters = data.chapters
				let favorited = await this.isFavorited(id) ?? false
				let statusData = await this.request(true, queries.status, { id: id })
				let status = statusData?.Media?.mediaListEntry
				if (status.status) status.index = Object.keys(mangaStatus).indexOf(status.status)
				else status.index = 0
				return { name: name, id: id, coverImage: coverImage, chapters: chapters, favorited: favorited, status: status }
			}
		},
		escape() {
			let play = false
			if (this.openMenu) {
				this.openMenu = false
				this.menuTab = 2
				play = true
			} else if (this.selectedChapter != null) {
				this.selectedChapter = null
				this.pages = { images: [], sizes: [] }
				document.title = `${this.selectedManga} | Clovre`
				play = true
			} else if (this.selectedManga) {
				this.selectedManga = null
				this.chapters = []
				document.title = `Browse | Clovre`
				play = true
			} else if (this.loaded) {
				this.loaded = false
				document.title = `Load Mangas Folder | Clovre`
				play = true
			}
			if (play) {
				this.playOff()
			}
		},
		focusInput() {
			if (this.selectedManga) {
				this.$refs.searchChapters.focus()
			} else if (this.loaded) {
				this.$refs.searchMangas.focus()
			}
		},
		imageSize(hide) {
			let res = ''
			if (hide) {
				res = 'hidden'
			} else {
				if (this.clickToLoad)
					res = 'cursor-pointer '
				switch (this.pageSize) {
					case 1:
						res = res + 'md:max-w-lg lg:max-w-xl'
						break;
					case 2:
						res = res + 'md:max-w-xl lg:max-w-4xl'
						break;
					case 3:
						res = res + '!w-screen'
						break;
				}
			}
			return res
		},
		skeletonSize(sizes) {
			return `height: ${sizes.height}px; width: ${sizes.width}px`
		},
		async dropMangasDirectory(e) {
			this.loading = 'mangas'
			this.dragover = false
			for (const item of e.dataTransfer.items) {
				// Careful: `kind` will be 'file' for both file
				// _and_ directory entries.
				if (item.kind === 'file') {
					const entry = await item.getAsFileSystemHandle();
					if (entry.kind === 'directory') {
						this.mangasHandle = entry
						this.handleMangaDir()
						break;
					} else {
						alert('directories only')
					}
				}
			}
		},
		async request(auth = false, query, variables = {}) {
			let headers = {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			}
			if (auth)
				headers.Authorization = 'Bearer ' + this.accessToken

			let options = {
				method: 'POST',
				headers: headers,
				body: JSON.stringify({
					query: query,
					variables: variables
				}),
				mode: 'cors',
			};

			let res = await fetch(this.graphqlUrl, options).then((res) => res.json()).catch((err) => console.error({ err }));
			return res?.data
		},
	}
}

const queries = {
	username: `
	query  {
		Viewer {
			name
		}
	}
	`,
	info: `
	query ($id: Int, $page: Int, $perPage: Int, $search: String, $type: MediaType) {
		Page (page: $page, perPage: $perPage) {
			media (id: $id, search: $search, type: $type) {
				id
				coverImage {
					large
				}
				chapters
			}
		}
	}
	`,
	chapters: `
	query ($id: Int) {
		Media (id: $id, type: MANGA) {
			chapters
		}
	}
	`,
	favorited: `
	query ($id: Int)  {
		Media(id: $id) {
			isFavourite
		}
	}`,
	status: `
	query ($id: Int)  {
		Media(id: $id) {
			mediaListEntry {
				status
				id
				progress
			}
		}
	}`,
	favorite: `
	mutation ($mangaId: Int)  {
		ToggleFavourite(mangaId: $mangaId) {
			manga {
				pageInfo {total}
			}
		}
	}`,
	setStatus: `
	mutation ($mediaId: Int, $status: MediaListStatus) {
		SaveMediaListEntry (mediaId: $mediaId, status: $status) {
			id
			status
		}
	}`,
	deleteStatus: `
	mutation ($id: Int) {
		DeleteMediaListEntry (id: $id) {
			deleted
		}
	}`,
	setProgress: `
	mutation ($mediaId: Int, $progress: Int) {
		SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
			id
			progress
		}
	}`,
}


const mangaStatus = {
	null: 'NULL',
	CURRENT: 'CURRENT',
	PLANNING: 'PLANNING',
	COMPLETED: 'COMPLETED',
	DROPPED: 'DROPPED',
	PAUSED: 'PAUSED',
	REPEATING: 'REPEATING',
}

const toDataURL = async (url) => fetch(url)
	.then(response => response.blob())
	.then(blob => new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	}))

const anilistSearch = async (name) => {
	let variables = {
		"search": name,
		"page": 1,
		"perPage": 1,
		"type": "MANGA"
	}
	let url = 'https://graphql.anilist.co'
	let options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify({
			query: queries.info,
			variables: variables
		}),
		mode: 'cors'
	};
	let res = await fetch(url, options).then((res) => { return res.json() })
		.catch((err) => console.error({ err }));
	return res?.data?.Page?.media?.[0]
}
export default main
