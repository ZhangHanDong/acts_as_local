# Include hook code here

require 'gor/acts_as_local'
require 'gor/local_helper'

ActionController::Base.class_eval do
  include GoR::ActsAsLocal
end

ActionView::Base.class_eval do
  include GoR::LocalHelper
end



