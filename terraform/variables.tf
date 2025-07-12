variable "project_id" {
  type        = string
  description = "Your GCP project ID"
}

variable "project_number" {
  type        = string
  description = "Your GCP project number"
}

variable "project_apikey" {
  type        = string
  description = "Firebase env variable"
}

variable "project_authdomain" {
  type        = string
  description = "Firebase env variable"
}

variable "project_storagebucket" {
  type        = string
  description = "Firebase env variable"
}

variable "project_messagingsenderid" {
  type        = string
  description = "Firebase env variable"
}

variable "project_appid" {
  type        = string
  description = "Firebase env variable"
}

variable "project_measurementid" {
  type        = string
  description = "Firebase env variable"
}

variable "project_region" {
  type        = string
  description = "Firebase env variable"
}

variable "service_account_key" {
  type        = string
  description = "Service account key in JSON format"
}

variable "github_owner" {
  type        = string
  description = "Github username or organization"
}

variable "github_token" {
  type        = string
  description = "Github finegrain token for the repository"
}

variable "github_repo" {
  type        = string
  description = "Github repository name"
}

variable "react_app_api_url" {
  type        = string
  description = "Subscriptions api address to be used on the react app"
}

variable "react_app_avatar_url" {
  type        = string
  description = "Url for generating dummy avatars to be used on react app"
}

variable "react_app_placeholder_url" {
  type        = string
  description = "Url for generating placeholder images to be used on react app"
}

variable "functions_api_url" {
  type        = string
  description = "Url for subscription's functions API"
}