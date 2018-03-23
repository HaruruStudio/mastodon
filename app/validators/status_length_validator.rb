# frozen_string_literal: true

class StatusLengthValidator < ActiveModel::Validator
  MAX_CHARS = 500

  def validate(status)
    return unless status.local? && !status.reblog?
    status.errors.add(:text, non_tag_status?(status)) if status.with_media? === false or non_tag_status?(status) === true or too_long?(status)
  end

  private
  def non_tag_status?(status)
    return false if status.text === '.' or status.text.delete('#' + Extractor.extract_hashtags(status.text).join('|#')).gsub(/\s/, '') === ''
    return true
  end

  def too_long?(status)
    countable_length(status) > MAX_CHARS
  end

  def countable_length(status)
    total_text(status).mb_chars.grapheme_length
  end

  def total_text(status)
    [status.spoiler_text, countable_text(status)].join
  end

  def countable_text(status)
    return '' if status.text.nil?

    status.text.dup.tap do |new_text|
      new_text.gsub!(FetchLinkCardService::URL_PATTERN, 'x' * 23)
      new_text.gsub!(Account::MENTION_RE, '@\2')
    end
  end
end
