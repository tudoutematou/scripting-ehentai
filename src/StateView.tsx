import { Text } from "scripting"

export function ErrorText({ message }: { message: string }) {
  return message ? <Text foregroundStyle="systemRed" font="caption">{message}</Text> : null
}

export function EmptyState({ message }: { message: string }) {
  return <Text font="subheadline" foregroundStyle="secondaryLabel" padding={{ vertical: 12 }}>{message}</Text>
}
