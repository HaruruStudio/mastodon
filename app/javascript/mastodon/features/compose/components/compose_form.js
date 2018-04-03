import React from 'react';
import CharacterCounter from './character_counter';
import Button from '../../../components/button';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import ReplyIndicatorContainer from '../containers/reply_indicator_container';
import AutosuggestTextarea from '../../../components/autosuggest_textarea';
import UploadButtonContainer from '../containers/upload_button_container';
import UploadGifButtonContainer from '../containers/upload_gif_button_container';
import { defineMessages, injectIntl } from 'react-intl';
import Collapsable from '../../../components/collapsable';
import SpoilerButtonContainer from '../containers/spoiler_button_container';
import PrivacyDropdownContainer from '../containers/privacy_dropdown_container';
import SensitiveButtonContainer from '../containers/sensitive_button_container';
import EmojiPickerDropdown from '../containers/emoji_picker_dropdown_container';
import UploadFormContainer from '../containers/upload_form_container';
import WarningContainer from '../containers/warning_container';
import { isMobile } from '../../../is_mobile';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { length } from 'stringz';
import { countableText } from '../util/counter';
import { uploadCompose } from './../../../actions/compose'
import reactCSS from 'reactcss'
import { SketchPicker } from 'react-color'
import LocationPicker from 'react-location-picker';
import ReactModal from 'react-modal';
import IconButton from '../../../components/icon_button';

const messages = defineMessages({
  placeholder: { id: 'compose_form.placeholder', defaultMessage: 'What is on your mind?' },
  spoiler_placeholder: { id: 'compose_form.spoiler_placeholder', defaultMessage: 'Write your warning here' },
  publish: { id: 'compose_form.publish', defaultMessage: 'Toot' },
  publishLoud: { id: 'compose_form.publish_loud', defaultMessage: '{publish}!' },
});

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const defaultPosition = {
  lat: 35.685175,
  lng: 139.7528
};

@injectIntl
export default class ComposeForm extends ImmutablePureComponent {
  state = {
    displayColorPicker: false,
    color: {
      r: '40',
      g: '44',
      b: '55',
      a: '100',
    },
    address: '',
    position: '',
    showModal: false,
    showOtherModal: false,
  };

  static propTypes = {
    intl: PropTypes.object.isRequired,
    text: PropTypes.string.isRequired,
    suggestion_token: PropTypes.string,
    suggestions: ImmutablePropTypes.list,
    spoiler: PropTypes.bool,
    privacy: PropTypes.string,
    spoiler_text: PropTypes.string,
    focusDate: PropTypes.instanceOf(Date),
    preselectDate: PropTypes.instanceOf(Date),
    is_submitting: PropTypes.bool,
    is_uploading: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onClearSuggestions: PropTypes.func.isRequired,
    onFetchSuggestions: PropTypes.func.isRequired,
    onSuggestionSelected: PropTypes.func.isRequired,
    onChangeSpoilerText: PropTypes.func.isRequired,
    onPaste: PropTypes.func.isRequired,
    onPickGeo: PropTypes.func.isRequired,
    onPickEmoji: PropTypes.func.isRequired,
    showSearch: PropTypes.bool,
    anyMedia: PropTypes.bool,
  };

  static defaultProps = {
    showSearch: false,
  };

  handleChange = (e) => {
    this.props.onChange(e.target.value);
  }

  handleKeyDown = (e) => {
    if (e.keyCode === 13 && (e.ctrlKey || e.metaKey)) {
      this.handleSubmit();
    }
  }

  handleSubmit = () => {
    if (this.props.text !== this.autosuggestTextarea.textarea.value) {
      // Something changed the text inside the textarea (e.g. browser extensions like Grammarly)
      // Update the state to match the current text
      this.props.onChange(this.autosuggestTextarea.textarea.value);
    }
    this.props.onSubmit();
    this.handleLocationClear()
  }

  onSuggestionsClearRequested = () => {
    this.props.onClearSuggestions();
  }

  onSuggestionsFetchRequested = (token) => {
    this.props.onFetchSuggestions(token);
  }

  onSuggestionSelected = (tokenStart, token, value) => {
    this._restoreCaret = null;
    this.props.onSuggestionSelected(tokenStart, token, value);
  }

  handleChangeSpoilerText = (e) => {
    this.props.onChangeSpoilerText(e.target.value);
  }

  componentWillReceiveProps (nextProps) {
    // If this is the update where we've finished uploading,
    // save the last caret position so we can restore it below!
    if (!nextProps.is_uploading && this.props.is_uploading) {
      this._restoreCaret = this.autosuggestTextarea.textarea.selectionStart;
    }
  }

  componentDidUpdate (prevProps) {
    // This statement does several things:
    // - If we're beginning a reply, and,
    //     - Replying to zero or one users, places the cursor at the end of the textbox.
    //     - Replying to more than one user, selects any usernames past the first;
    //       this provides a convenient shortcut to drop everyone else from the conversation.
    // - If we've just finished uploading an image, and have a saved caret position,
    //   restores the cursor to that position after the text changes!
    if (this.props.focusDate !== prevProps.focusDate || (prevProps.is_uploading && !this.props.is_uploading && typeof this._restoreCaret === 'number')) {
      let selectionEnd, selectionStart;

      if (this.props.preselectDate !== prevProps.preselectDate) {
        selectionEnd   = this.props.text.length;
        selectionStart = this.props.text.search(/\s/) + 1;
      } else if (typeof this._restoreCaret === 'number') {
        selectionStart = this._restoreCaret;
        selectionEnd   = this._restoreCaret;
      } else {
        selectionEnd   = this.props.text.length;
        selectionStart = selectionEnd;
      }

      this.autosuggestTextarea.textarea.setSelectionRange(selectionStart, selectionEnd);
      this.autosuggestTextarea.textarea.focus();
    } else if(prevProps.is_submitting && !this.props.is_submitting) {
      this.autosuggestTextarea.textarea.focus();
    }
  }

  setAutosuggestTextarea = (c) => {
    this.autosuggestTextarea = c;
  }

  handleEmojiPick = (data) => {
    const position     = this.autosuggestTextarea.textarea.selectionStart;
    const emojiChar    = data.native;
    this._restoreCaret = position + emojiChar.length + 1;
    this.props.onPickEmoji(position, data);
  }
  
  handleClick = () => {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  }

  handleClose = () => {
    this.setState({ displayColorPicker: false })
  }

  handleChangeColor = (color) => {
    this.autosuggestTextarea.textarea.value = `[${color.hex.slice(1)}]${this.autosuggestTextarea.textarea.value.replace(/\[.+?\]/, '')}`;
    this.setState({ color: color.rgb })
  }

  handleLocationChange = ({position, address}) => {
    this.setState({ position, address });
    this.props.onPickGeo(position.lat, position.lng, address);
  }

  handleLocationClear = () => {
    this.setState({ position: '', address: '' });
    this.props.onPickGeo(null, null);
  }

  handleOpenModal = () =>  {
    this.setState({ showModal: true, showOtherModal: false });
  }
  
  handleCloseModal = () => {
    this.setState({ showModal: false });
  }

  handleOpenOtherModal = () =>  {
    this.setState({ showOtherModal: true });
  }
  
  handleCloseOtherModal = () => {
    this.setState({ showOtherModal: false });
  }

  render () {
    const { intl, onPaste, onPickGeo,showSearch, anyMedia } = this.props;
    const disabled = this.props.is_submitting;
    const text     = [this.props.spoiler_text, countableText(this.props.text)].join('');
    const disabledButton = disabled || this.props.is_uploading || length(text) > 500 || (text.length !== 0 && text.trim().length === 0 && !anyMedia);
    let publishText = '';
    const styles = reactCSS({
      'default': {
        color: {
          width: '14px',
          height: '14px',
          borderRadius: '2px',
          background: `rgba(${ this.state.color.r }, ${ this.state.color.g }, ${ this.state.color.b }, ${ this.state.color.a })`,
        },
        swatch: {
          padding: '6px',
          background: '#fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
          display: 'inline-block',
          cursor: 'pointer',
        },
        popover: {
          position: 'absolute',
          zIndex: '5',
        },
        cover: {
          position: 'fixed',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      },
    });


    if (this.props.privacy === 'private' || this.props.privacy === 'direct') {
      publishText = <span className='compose-form__publish-private'><i className='fa fa-lock' /> {intl.formatMessage(messages.publish)}</span>;
    } else {
      publishText = this.props.privacy !== 'unlisted' ? intl.formatMessage(messages.publishLoud, { publish: intl.formatMessage(messages.publish) }) : intl.formatMessage(messages.publish);
    }

    const buttonStyle={cursor: 'pointer', marginTop: '10px', fontSize: '1.3em', textAlign: 'middle'};

    return (
      <div className='compose-form'>
        <WarningContainer />

        <Collapsable isVisible={this.props.spoiler} fullHeight={50}>
          <div className='spoiler-input'>
            <label>
              <span style={{ display: 'none' }}>{intl.formatMessage(messages.spoiler_placeholder)}</span>
              <input placeholder={intl.formatMessage(messages.spoiler_placeholder)} value={this.props.spoiler_text} onChange={this.handleChangeSpoilerText} onKeyDown={this.handleKeyDown} type='text' className='spoiler-input__input'  id='cw-spoiler-input' />
            </label>
          </div>
        </Collapsable>

        <ReplyIndicatorContainer />
        <div className='compose-form__autosuggest-wrapper'>
          <AutosuggestTextarea
            ref={this.setAutosuggestTextarea}
            placeholder={intl.formatMessage(messages.placeholder)}
            disabled={disabled}
            value={this.props.text}
            onChange={this.handleChange}
            suggestions={this.props.suggestions}
            onKeyDown={this.handleKeyDown}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            onSuggestionSelected={this.onSuggestionSelected}
            onPaste={onPaste}
            autoFocus={!showSearch && !isMobile(window.innerWidth)}
          />
          <EmojiPickerDropdown onPickEmoji={this.handleEmojiPick} />
        </div>

        <div className='compose-form__modifiers'>
          <UploadFormContainer />
        </div>

        <div className='compose-form__buttons-wrapper' style={{backgroundColor: rgbToHex(this.state.color.r, this.state.color.g, this.state.color.b)}}>
          <div className='compose-form__buttons'>
            <div>
              <IconButton icon='eyedropper' title='色を追加' inverted disabled={false} onClick={this.handleClick} size={20} />
              { this.state.displayColorPicker ? <div style={ styles.popover }>
                <div style={ styles.cover } onClick={ this.handleClose }/>
                <SketchPicker color={this.state.color} onChange={this.handleChangeColor} />
              </div> : null }
            </div>
            <UploadButtonContainer />
            <PrivacyDropdownContainer />
            <SensitiveButtonContainer />
            <SpoilerButtonContainer />
            <IconButton icon='briefcase' title='その他機能' inverted disabled={false} onClick={this.handleOpenOtherModal} size={20} />
            </div>
          <div className='character-counter__wrapper'><CharacterCounter max={500} text={text} /></div>
        </div>
        <div>
          <ReactModal 
            isOpen={this.state.showModal}
            contentLabel="Location Pick Modal"
            style={{
              overlay: {
                zIndex: 100,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
              content: {
                backgroundColor: '#282C37',
              }
            }}
          >
            <Button text='閉じる' onClick={this.handleCloseModal} block />
            <h1>{this.state.address}</h1>
            <Button text='クリア' onClick={this.handleLocationClear} style={{marginTop: '15px'}} />
            <div>
              <LocationPicker
                containerElement={ <div style={ {height: '100%'} } /> }
                mapElement={ <div style={ {height: '500px'} } /> }
                defaultPosition={defaultPosition}
                onChange={this.handleLocationChange}
              />
            </div>
          </ReactModal>
        </div>
        <div>
          <ReactModal 
            isOpen={this.state.showOtherModal}
            contentLabel="Other Modal"
            style={{
              overlay: {
                zIndex: 100,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
              content: {
                backgroundColor: '#282C37',
              }
            }}
          >
            <div className='flex-text flex-column'>
              <Button text='閉じる' onClick={this.handleCloseOtherModal} block />
              <hr style={{ width: '100%' }}/>
              <h1 style={{fontSize: '1.85em'}}>投稿</h1>
              <div onClick={this.handleOpenModal} className='flex'>
                <IconButton icon='map-marker' title='位置情報を追加' inverted disabled={false} size={30} />
                <h1 style={buttonStyle}>位置情報を追加</h1>
              </div>
              <div onClick={() => {}} className='flex'>
                <IconButton icon='smile-o' title='画像にスタンプを貼り付ける' inverted disabled={false} size={30} />
                <h1 style={buttonStyle}>画像にスタンプを貼り付ける(準備中)</h1>
              </div>
              <div onClick={() => {}} className='flex'>
                <IconButton icon='paint-brush' title='お絵かき' inverted disabled={false} size={30} />
                <h1 style={buttonStyle}>お絵かき(準備中)</h1>
              </div>
              <hr style={{ width: '100%' }}/>
              <h1 style={{fontSize: '1.85em'}}>共通機能</h1>
              <div onClick={() => {}} className='flex'>
                <IconButton icon='smile-o' title='スタンプを追加' inverted disabled={false} size={30} />
                <h1 style={buttonStyle}>スタンプを追加(準備中)</h1>
              </div>
            </div>
          </ReactModal>
        </div>
        <h1>{this.state.address}</h1>
        <div className='compose-form__publish'>
          <div className='compose-form__publish-button-wrapper'><Button text={publishText} onClick={this.handleSubmit} disabled={disabledButton} block /></div>
        </div>
        <Button text='Mastodon Rater' onClick={() => {window.open('https://genbuproject.github.io/MastodonRater/','_blank')}} block style={{ marginTop: '10px' }}/>
        <UploadGifButtonContainer />
        </div>
    );
  }

}
