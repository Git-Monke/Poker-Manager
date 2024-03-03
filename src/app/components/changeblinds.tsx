"use client";

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z
  .object({
    smallblind: z.preprocess(
      (a) => parseFloat(z.string().parse(a)),
      z.number()
    ),
    bigblind: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number()),
  })
  .refine(
    (data) => {
      return data.smallblind > 0;
    },
    { message: "Must be greater than 0", path: ["smallblind"] }
  )
  .refine(
    (data) => {
      return data.bigblind > 0;
    },
    { message: "Must be greater than 0", path: ["bigblind"] }
  );

export default function ChangeBlinds() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smallblind: 1,
      bigblind: 2,
    },
  });

  const handleSubmit = () => {};

  return (
    <Dialog>
      <DialogTrigger className="text-background text-sm font-semibold">
        Change Blinds
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Change Blinds</DialogTitle>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-8"
            >
              <FormField
                name="smallblind"
                control={form.control}
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Small Blind</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$1"
                          type="number"
                          {...field}
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                name="bigblind"
                control={form.control}
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Big Blind</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$2"
                          type="number"
                          {...field}
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <Button type="submit">Set</Button>
            </form>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
