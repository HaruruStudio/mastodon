class Util {
	static getRelatedLinks (exec) {
		if (exec) {
			let links = exec.getResponseHeader("link").split(", ");
				links.forEach((link, index) => {
					links[link.match(/rel="(.*)"/)[1]] = link.match(/<.*\?.*=(.*)>/)[1];
				});

			return links;
		}
	}

	static getTheday (date = new Date()) {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}
}