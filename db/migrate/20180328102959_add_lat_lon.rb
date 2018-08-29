class AddLatLon < ActiveRecord::Migration[5.1]
  def change
    add_column :statuses, :lat, :decimal, :precision => 17, :scale => 14
    add_column :statuses, :lon, :decimal, :precision => 17, :scale => 14
  end
end
