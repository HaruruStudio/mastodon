import React from 'react';
import axios from 'axios';
import { key } from '../../../../../../picto.config';
import { Selector, ResultSort, Rating } from 'react-giphy-selector';
import IconButton from '../../../components/icon_button';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import ImmutablePureComponent from 'react-immutable-pure-component';
import ImmutablePropTypes from 'react-immutable-proptypes';

const messages = defineMessages({
  upload: { id: 'upload_button.label', defaultMessage: 'Add media' },
});

const makeMapStateToProps = () => {
  const mapStateToProps = state => ({
    acceptContentTypes: state.getIn(['media_attachments', 'accept_content_types']),
  });

  return mapStateToProps;
};

const iconStyle = {
  height: null,
  lineHeight: '27px',
};

@connect(makeMapStateToProps)
@injectIntl
export default class UploadGifButton extends ImmutablePureComponent {

  static propTypes = {
    disabled: PropTypes.bool,
    onSelectFile: PropTypes.func.isRequired,
    style: PropTypes.object,
    resetFileKey: PropTypes.number,
    acceptContentTypes: ImmutablePropTypes.listOf(PropTypes.string).isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleChange = (e) => {
    axios.get(e.images.downsized.gif_url, { responseType: 'arraybuffer' })
      .then((response) => {
        console.log(response);
        const file = new File([response.data], 'gif.gif');
        this.props.onSelectFile([file]);
      });
  }

  setRef = (c) => {
    this.fileElement = c;
  }

  render () {

    const { intl, resetFileKey, disabled, acceptContentTypes } = this.props;

    return (
      <Selector
        apiKey={key}
        onGifSelected={this.handleChange}
        key={resetFileKey}
        ref={this.setRef}
        type='file'
        multiple={false}
        accept={acceptContentTypes.toArray().join(',')}
        style={{ display: 'none' }}
      />
    );
  }

}
