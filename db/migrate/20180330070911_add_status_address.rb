class AddStatusAddress < ActiveRecord::Migration[5.1]
  def change
    add_column :statuses, :address, :string
  end
end
