class Relevance {
	static get STAR () { return 1 }
	static get BOOST () { return 2 }
	static get MENTION () { return 4 }

	static getFollowings (id = 0) {
		return new Promise((resolve, reject) => {
			let result = [];

			(function looper (nextToken = "") {
				let getter = app.get(`accounts/${id}/following`, { limit: 80, max_id: nextToken });
					getter.then(res => {
						for (let user of res) {
							result.push(user);
						}



						let links = Util.getRelatedLinks(getter);

						if (links.next) {
							looper(links.next);
							return;
						}

						resolve(result);
					});
			})();
		});
	}

	static getFriends (id = 0) {
		return new Promise((resolve, reject) => {
			let result = [];
				Relevance.getFollowings(id).then(res => {
					for (let user of res) {
						result[user.id] = user;

						result[user.id].star = 0,
						result[user.id].boost = 0,
						result[user.id].mention = 0;
					}
				});

			resolve(result);
		});
	}

	static getStars (friends = [], date = new Date()) {
		return new Promise((resolve, reject) => {
			(function looper (nextToken = "") {
				let getter = app.get(`favourites`, { limit: 40, max_id: nextToken });
					getter.then(res => {
						for (let post of res) {
							if (date.getTime() <= new Date(post.created_at).getTime()) {
								if (friends[post.account.id]) friends[post.account.id].star++;
							} else {
								resolve(friends);
								return;
							}
						}



						let links = Util.getRelatedLinks(getter);

						if (links.next) {
							looper(links.next);
							return;
						}

						resolve(friends);
					});
			})();
		});
	}

	static getBoostsAndMentions (id = 0, friends = [], date = new Date()) {
		return new Promise((resolve, reject) => {
			(function looper (nextToken = "") {
				let getter = app.get(`accounts/${id}/statuses`, { limit: 40, max_id: nextToken });
					getter.then(res => {
						for (let post of res) {
							if (date.getTime() <= new Date(post.created_at).getTime()) {
								if (post.reblog) {
									if (friends[post.reblog.account.id]) friends[post.reblog.account.id].boost++;
								}

								for (let mention of post.mentions) {
									if (friends[mention.id]) friends[mention.id].mention++;
								}
							} else {
								resolve(friends);
								return;
							}
						}



						let links = Util.getRelatedLinks(getter);

						if (links.next) {
							looper(links.next);
							return;
						}

						resolve(friends);
					});
			})();
		});
	}
}