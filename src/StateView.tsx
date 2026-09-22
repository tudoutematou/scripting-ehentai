import { Image, Text, VStack } from "scripting"

export function ErrorText({ message }: { message: string }) {
  return message ? <Text foregroundStyle="systemRed" font="caption" frame={{maxWidth:"infinity",alignment:"leading"}}>{message}</Text> : null
}

export function EmptyState({ message, systemImage="tray" }: { message: string; systemImage?: string }) {
  return <VStack spacing={8} padding={{vertical:20}} frame={{maxWidth:"infinity",alignment:"center"}}><Image systemName={systemImage} foregroundStyle="tertiaryLabel"/><Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="center">{message}</Text></VStack>
}
