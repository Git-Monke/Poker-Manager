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
    name: z.string().min(1, "Name is required"),
    buyin: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number()),
  })
  .refine(
    (data) => {
      return data.buyin > 0;
    },
    { message: "Must be greater than 0", path: ["buyin"] }
  );

export type AddPlayerData = z.infer<typeof formSchema>;

interface AddPlayerProps {
  onSubmit: (data: AddPlayerData) => void;
  existingPlayers: string[];
}

export default function AddPlayer({
  onSubmit,
  existingPlayers,
}: AddPlayerProps) {
  const moreRefinedForm = formSchema.refine(
    (data) => {
      return !existingPlayers.includes(data.name);
    },
    {
      message: "Cannot duplicate names",
      path: ["name"],
    }
  );

  const form = useForm<AddPlayerData>({
    resolver: zodResolver(moreRefinedForm),
    defaultValues: {
      name: "",
    },
  });

  return (
    <Dialog>
      <DialogTrigger className="text-background text-sm font-semibold">
        Add Player
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Add Player</DialogTitle>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-8"
            >
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Name"
                          type="string"
                          {...field}
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                name="buyin"
                control={form.control}
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Initial Stack Size</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$1,000"
                          type="number"
                          {...field}
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <Button type="submit">Add</Button>
            </form>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
