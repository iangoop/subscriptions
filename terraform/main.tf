resource "google_project_iam_member" "eventarc_service_agent" {
  project = var.project_id
  role    = "roles/eventarc.serviceAgent"
  member  = "serviceAccount:service-${var.project_number}@gcp-sa-eventarc.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${var.project_number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "iam_service_account_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "eventarc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "github_actions_secret" "firebase_token" {
  repository       = var.github_repo
  secret_name      = "CUSTOM_FIREBASE_APIKEY"
  plaintext_value  = var.project_apikey
}

resource "github_actions_variable" "firebase_authdomain" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_AUTHDOMAIN"
  value         = var.project_authdomain
}

resource "github_actions_variable" "firebase_projectid" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_PROJECTID"
  value         = var.project_id
}

resource "github_actions_variable" "firebase_storagebucket" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_STORAGEBUCKET"
  value         = var.project_storagebucket
}

resource "github_actions_variable" "firebase_messagingsenderid" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_MESSAGINGSENDERID"
  value         = var.project_messagingsenderid
}

resource "github_actions_variable" "firebase_appid" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_APPID"
  value         = var.project_appid
}

resource "github_actions_variable" "firebase_measurementid" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_MEASUREMENTID"
  value         = var.project_measurementid
}

resource "github_actions_variable" "firebase_region" {
  repository    = var.github_repo
  variable_name = "CUSTOM_FIREBASE_REGION"
  value         = var.project_region
}


resource "github_actions_variable" "react_app_api_url" {
  repository    = var.github_repo
  variable_name = "REACT_APP_API_URL"
  value         = var.react_app_api_url
}

resource "github_actions_variable" "react_app_avatar_url" {
  repository    = var.github_repo
  variable_name = "REACT_APP_AVATAR_URL"
  value         = var.react_app_avatar_url
}

resource "github_actions_variable" "react_app_placeholder_url" {
  repository    = var.github_repo
  variable_name = "REACT_APP_PLACEHOLDER_URL"
  value         = var.react_app_placeholder_url
}


resource "github_actions_variable" "functions_api_url" {
  repository    = var.github_repo
  variable_name = "FUNCTIONS_API_URL"
  value         = var.functions_api_url
}