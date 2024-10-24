import { Spinner } from "@renderer/components/ui/spinner"
import { Recorder } from "@renderer/lib/recorder"
import { playSound } from "@renderer/lib/sound"
import { cn } from "@renderer/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { rendererHandlers, tipcClient } from "~/lib/tipc-client"

const VISUALIZER_BUFFER_LENGTH = 70

const getInitialVisualizerData = () =>
  Array<number>(VISUALIZER_BUFFER_LENGTH).fill(-1000)

export function Component() {
  const [visualizerData, setVisualizerData] = useState(() =>
    getInitialVisualizerData(),
  )
  const [recording, setRecording] = useState(false)
  const isConfirmedRef = useRef(false)

  const transcribeMutation = useMutation({
    mutationFn: async ({
      blob,
      duration,
    }: {
      blob: Blob
      duration: number
    }) => {
      await tipcClient.createRecording({
        recording: await blob.arrayBuffer(),
        duration,
      })
    },
    onError(error) {
      tipcClient.hidePanelWindow()
      tipcClient.displayError({
        title: error.name,
        message: error.message,
      })
    },
  })

  const recorderRef = useRef<Recorder | null>(null)

  useEffect(() => {
    if (recorderRef.current) return

    const recorder = (recorderRef.current = new Recorder())

    recorder.on("record-start", () => {
      setRecording(true)
      tipcClient.recordEvent({ type: "start" })
    })

    recorder.on("visualizer-data", (rms) => {
      setVisualizerData((prev) => {
        const data = [...prev, rms]

        if (data.length > VISUALIZER_BUFFER_LENGTH) {
          data.shift()
        }

        return data
      })
    })

    recorder.on("record-end", (blob, duration) => {
      setRecording(false)
      setVisualizerData(() => getInitialVisualizerData())
      tipcClient.recordEvent({ type: "end" })

      if (!isConfirmedRef.current) return

      playSound("end_record")
      transcribeMutation.mutate({
        blob,
        duration,
      })
    })
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.startRecording.listen(() => {
      setVisualizerData(() => getInitialVisualizerData())
      recorderRef.current?.startRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.finishRecording.listen(() => {
      isConfirmedRef.current = true
      recorderRef.current?.stopRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.stopRecording.listen(() => {
      isConfirmedRef.current = false
      recorderRef.current?.stopRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.startOrFinishRecording.listen(() => {
      if (recording) {
        isConfirmedRef.current = true
        recorderRef.current?.stopRecording()
      } else {
        tipcClient.showPanelWindow()
        recorderRef.current?.startRecording()
      }
    })

    return unlisten
  }, [recording])

  return (
    <div className="flex mx-3 h-screen dark:text-white">
      {transcribeMutation.isPending ? (
        <div className="flex h-full w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex h-full w-full rounded-xl transition-colors">
          <div className="flex shrink-0"></div>
          <div
            className="relative flex grow items-center overflow-hidden"
            dir="rtl"
          >
            <div className="absolute right-0 flex h-6 items-center gap-0.5">
              {visualizerData
                .slice()
                .reverse()
                .map((rms, index) => {
                  return (
                    <div
                      key={index}
                      className={cn(
                        "h-full w-0.5 shrink-0 rounded-lg",
                        "bg-green-400 dark:bg-white",
                        rms === -1000 && "bg-neutral-100 dark:bg-neutral-500",
                      )}
                      style={{
                        height: `${Math.min(20, Math.max(16, rms * 20))}%`,
                      }}
                    />
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
