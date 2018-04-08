import api from '../api';

import { me } from '../initial_state';
import Util from '../lib/Util';

export const TOOT_RATE_REQUEST = 'TOOT_RATE_REQUEST';
export const TOOT_RATE_SUCCESS = 'TOOT_RATE_SUCCESS';
export const TOOT_RATE_FAIL = 'TOOT_RATE_FAIL';

export const TPD_REQUEST = 'TPD_REQUEST';
export const TPD_SUCCESS = 'TPD_SUCCESS';
export const TPD_FAIL = 'TPD_FAIL';

export const RELEVANCE_REQUEST = 'RELEVANCE_REQUEST';
export const RELEVANCE_SUCCESS = 'RELEVANCE_SUCCESS';
export const RELEVANCE_FAIL = 'RELEVANCE_FAIL';

export const SITEURL = "https://genbuproject.github.io/MastodonRater/";

export function tootRate() {
  return (dispatch, getState) => {
    dispatch(tootRateRequest());
    let serverToots;
    let userToots;
    let userInfo;

    api(getState).get('/api/v1/instance', {})
      .then(response => {
        serverToots = response.data.stats.status_count;
        return api(getState).get('/api/v1/accounts/verify_credentials', {});
      }).then((response) => {
        userInfo = response.data;
        userToots = userInfo.statuses_count;
        api(getState).post('/api/v1/statuses', {
          status: [
            `@${userInfo.username} さんの`,
            `#トゥート率 は${(userToots / serverToots * 100).toFixed(2)}%です！`,
            "",
            "(Tooted from #MastodonRater)",
            SITEURL
          ].join("\r\n")
        });
        dispatch(tootRateSuccess(response.data, null));
      }).catch(error => {
        dispatch(tootRateFail(error));
      });
  };
};

export function tootRateRequest() {
  return {
    type: TOOT_RATE_REQUEST,
  };
};

export function tootRateSuccess(statuses, next) {
  return {
    type: TOOT_RATE_SUCCESS,
    statuses,
    next,
  };
};

export function tootRateFail(error) {
  return {
    type: TOOT_RATE_FAIL,
    error,
  };
};

export function tpd() {
  return (dispatch, getState) => {
    dispatch(tpdRequest());
    let nowTime;
    let createdAt;
    let countDays;
    api(getState).get('/api/v1/accounts/verify_credentials', {})
      .then((response) => {
        nowTime = new Date().getTime();
        createdAt = new Date(response.data.created_at).getTime()
        countDays = Math.floor((nowTime - createdAt) / (1000 * 60 * 60 * 24));
        api(getState).post('/api/v1/statuses', {
          status: [
            `@${response.data.username} さんの`,
            `経過日数は${countDays}日`,
            `#TPD は${Math.floor(response.data.statuses_count / countDays)}です！`,
            "",
            "(Tooted from #MastodonRater)",
            SITEURL
          ].join("\r\n")
        });
        dispatch(tpdSuccess(response.data, null));
      }).catch(error => {
        dispatch(tpdRateFail(error));
      });
  };
};

export function tpdRequest() {
  return {
    type: TPD_REQUEST,
  };
};

export function tpdSuccess(statuses, next) {
  return {
    type: TPD_SUCCESS,
    statuses,
    next,
  };
};

export function tpdFail(error) {
  return {
    type: TPD_FAIL,
    error,
  };
};

export function getRelevance(dateArea) {
  return (dispatch, getState) => {
    dispatch(tootRateRequest());

    function STAR() { return 1 }
    function BOOST() { return 2 }
    function MENTION() { return 4 }

    function getFollowings(id = 0) {
      return new Promise((resolve, reject) => {
        let result = [];

        (function looper(nextToken = "") {
          let getter = api(getState).get(`/api/v1/accounts/${id}/following`, { limit: 80, max_id: nextToken });
          getter.then(res => {
            for (let user of res.data) {
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

    function getFriends(id = 0) {
      return new Promise((resolve, reject) => {
        let result = [];
        getFollowings(id).then(res => {
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

    function getStars(friends = [], date = new Date()) {
      return new Promise((resolve, reject) => {
        (function looper(nextToken = "") {
          let getter = api(getState).get(`/api/v1/favourites`, { limit: 40, max_id: nextToken });
          getter.then(res => {
            for (let post of res.data) {
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

    function getBoostsAndMentions(id = 0, friends = [], date = new Date()) {
      return new Promise((resolve, reject) => {
        (function looper(nextToken = "") {
          let getter = api(getState).get(`/api/v1/accounts/${id}/statuses`, { limit: 40, max_id: nextToken });
          getter.then(res => {
            for (let post of res.data) {
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

    let date = Util.getTheday(new Date(Date.now() - 1000 * 60 * 60 * 24 * dateArea));
    let myself = {};
    let tootContent;
    api(getState).get('/api/v1/accounts/verify_credentials', {})
      .then(res => myself = res)
      .then((response) => {
        let friends = [];
        getFriends(myself.id).then(res => friends = res).then((friends) => {
          getBoostsAndMentions(myself.id, friends, date).then(res => friends = res).then(() => {
            getStars(friends, date).then(res => friends = res).then(() => {
              let scores = [];

              for (let friend of friends) {
                if (friend) {
                  scores.push([friend.acct, friend.star * STAR + friend.boost * BOOST + friend.mention * MENTION]);
                }
              }

              scores.sort((score1, score2) => {
                if (score1[1] > score2[1]) return -1;
                if (score1[1] < score2[1]) return 1;

                return 0;
              });
              tootContent = [
                "#RelevanceAnalyzer",
                `${dateArea == 0 ? "本日分" : dateArea + "日前まで"}の #統計さん`,
                "",
                `@${myself.username} さんと`,
                `仲良しのユーザーは`,
                "",
                (rank => {
                  let ranking = [];

                  for (let i = 0; i < rank; i++) {
                    ranking.push([
                      `《${i + 1}位》`,
                      `${scores[i][0]}(Score ${scores[i][1]})`,
                      ""
                    ].join("\r\n"));
                  }

                  return ranking.join("\r\n");
                })(3),
                "の方々です！！",
                "",
                "(Tooted from #MastodonRater)",
                SITEURL
              ].join("\r\n");
            });
          });
        });
        api(getState).post('/api/v1/statuses', {
          status: tootContent
        });
        dispatch(tootRateSuccess(response.data, null));
      }).catch(error => {
        dispatch(tootRateFail(error));
      });
  };
};

export function RelevanceRequest() {
  return {
    type: RELEVANCE_REQUEST,
  };
};

export function RelevanceSuccess(statuses, next) {
  return {
    type: RELEVANCE_SUCCESS,
    statuses,
    next,
  };
};

export function RelevanceFail(error) {
  return {
    type: RELEVANCE_FAIL,
    error,
  };
};