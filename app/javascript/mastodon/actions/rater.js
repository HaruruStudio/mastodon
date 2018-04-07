import api from '../api';

import { me } from '../initial_state';

export const TOOT_RATE_REQUEST = 'TOOT_RATE_REQUEST';
export const TOOT_RATE_SUCCESS = 'TOOT_RATE_SUCCESS';
export const TOOT_RATE_FAIL = 'TOOT_RATE_FAIL';
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
