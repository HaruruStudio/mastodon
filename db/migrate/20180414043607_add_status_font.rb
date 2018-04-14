class AddStatusFont < ActiveRecord::Migration[5.1]
  def change
    add_column :statuses, :font, :string
  end
end
